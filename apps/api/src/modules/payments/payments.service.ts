import type { PrismaClient } from '@oasys/database';
import { AppError } from '../../lib/errors';
import { getPagarmeService } from './pagarme.service';
import { emitNFCeForCheck } from '../fiscal/fiscal.service';

// ── Shared: Validate Check ──────────────────────────────────────────
async function validateCheck(
  prisma: PrismaClient,
  checkId: string,
  unitId: string,
  amount: number,
) {
  const check = await prisma.check.findUnique({
    where: { id: checkId },
    include: {
      orders: { include: { items: true } },
      payments: { where: { status: 'CONFIRMED' } },
      unit: { select: { serviceFeeRate: true } },
    },
  });

  if (!check) {
    throw AppError.notFound('Conta não encontrada');
  }

  if (check.unitId !== unitId) {
    throw AppError.forbidden('Conta não pertence a esta unidade');
  }

  if (check.status === 'PAID') {
    throw AppError.badRequest('Conta já foi paga');
  }

  if (check.status === 'CANCELLED') {
    throw AppError.badRequest('Conta foi cancelada');
  }

  if (check.status !== 'OPEN') {
    throw AppError.badRequest('Conta não está aberta');
  }

  // Calculate remaining balance
  const { grossTotal, totalPaid } = calculateCheckTotals(check);
  const remainingBalance = grossTotal - totalPaid;

  if (amount > remainingBalance + 0.01) {
    throw AppError.badRequest(
      `Valor excede saldo restante de R$ ${remainingBalance.toFixed(2)}`,
    );
  }

  return { check, grossTotal, totalPaid, remainingBalance };
}

// ── Shared: Calculate Check Totals ──────────────────────────────────
function calculateCheckTotals(check: {
  orders: Array<{ items: Array<{ unitPrice: unknown; quantity: number }> }>;
  payments: Array<{ amount: unknown }>;
  serviceFeeAmount: unknown;
  tipAmount: unknown;
  discountAmount: unknown;
  unit: { serviceFeeRate: unknown };
}) {
  const itemsTotal = check.orders.reduce(
    (sum, order) =>
      sum +
      order.items.reduce(
        (s, item) => s + Number(item.unitPrice) * item.quantity,
        0,
      ),
    0,
  );

  const serviceFee =
    check.serviceFeeAmount != null
      ? Number(check.serviceFeeAmount)
      : check.unit.serviceFeeRate
        ? itemsTotal * Number(check.unit.serviceFeeRate)
        : 0;

  const tip = check.tipAmount != null ? Number(check.tipAmount) : 0;
  const discount =
    check.discountAmount != null ? Number(check.discountAmount) : 0;
  const grossTotal = itemsTotal + serviceFee + tip - discount;

  const totalPaid = check.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );

  return { itemsTotal, serviceFee, tip, discount, grossTotal, totalPaid };
}

// ── Shared: Check Payment Completion ────────────────────────────────
export async function checkPaymentCompletion(
  prisma: PrismaClient,
  checkId: string,
): Promise<{ isPaid: boolean; remainingBalance: number }> {
  const check = await prisma.check.findUnique({
    where: { id: checkId },
    include: {
      orders: { include: { items: true } },
      payments: { where: { status: 'CONFIRMED' } },
      unit: { select: { serviceFeeRate: true } },
    },
  });

  if (!check) return { isPaid: false, remainingBalance: 0 };

  const { grossTotal, totalPaid, serviceFee } = calculateCheckTotals(check);
  const remainingBalance = grossTotal - totalPaid;
  const isPaid = remainingBalance <= 0.01; // R$0.01 tolerance

  if (isPaid && check.status !== 'PAID') {
    await prisma.check.update({
      where: { id: checkId },
      data: {
        status: 'PAID',
        closedAt: new Date(),
        serviceFeeAmount: serviceFee,
      },
    });

    // Fire-and-forget: emit NFC-e asynchronously (PRD-06)
    emitNFCeForCheck(prisma, checkId).catch((err) => {
      console.error('[fiscal] Auto-emission failed for check', checkId, err);
    });
  }

  return { isPaid, remainingBalance: Math.max(0, remainingBalance) };
}

// ── Cash Payment ────────────────────────────────────────────────────
export async function createCashPayment(
  prisma: PrismaClient,
  input: { checkId: string; amount: number; receivedAmount?: number },
  employeeId: string,
  unitId: string,
) {
  const { remainingBalance } = await validateCheck(
    prisma,
    input.checkId,
    unitId,
    input.amount,
  );

  // Find operator's open cash register
  const cashRegister = await prisma.cashRegister.findFirst({
    where: { employeeId, status: 'OPEN' },
  });

  if (!cashRegister) {
    throw AppError.badRequest(
      'Nenhum caixa aberto. Abra um caixa antes de registrar pagamento.',
    );
  }

  const change = input.receivedAmount
    ? input.receivedAmount - input.amount
    : 0;

  const payment = await prisma.payment.create({
    data: {
      checkId: input.checkId,
      employeeId,
      method: 'CASH',
      amount: input.amount,
      status: 'CONFIRMED',
      paidAt: new Date(),
      cashRegisterId: cashRegister.id,
      metadata: input.receivedAmount
        ? { receivedAmount: input.receivedAmount, change }
        : undefined,
    },
  });

  const { isPaid, remainingBalance: newBalance } =
    await checkPaymentCompletion(prisma, input.checkId);

  return {
    ...payment,
    amount: Number(payment.amount),
    change,
    checkStatus: isPaid ? 'PAID' : 'OPEN',
    remainingBalance: newBalance,
  };
}

// ── Card-Present Payment ────────────────────────────────────────────
export async function createCardPresentPayment(
  prisma: PrismaClient,
  input: {
    checkId: string;
    amount: number;
    cardBrand?: string;
    lastFourDigits?: string;
    isDebit?: boolean;
  },
  employeeId: string,
  unitId: string,
) {
  await validateCheck(prisma, input.checkId, unitId, input.amount);

  const method = input.isDebit ? 'DEBIT_CARD' : 'CREDIT_CARD';

  const payment = await prisma.payment.create({
    data: {
      checkId: input.checkId,
      employeeId,
      method,
      amount: input.amount,
      status: 'CONFIRMED',
      paidAt: new Date(),
      metadata: {
        cardBrand: input.cardBrand ?? null,
        lastFourDigits: input.lastFourDigits ?? null,
        cardPresent: true,
      },
    },
  });

  const { isPaid, remainingBalance } = await checkPaymentCompletion(
    prisma,
    input.checkId,
  );

  return {
    ...payment,
    amount: Number(payment.amount),
    checkStatus: isPaid ? 'PAID' : 'OPEN',
    remainingBalance,
  };
}

// ── PIX Payment ─────────────────────────────────────────────────────
export async function createPixPayment(
  prisma: PrismaClient,
  input: {
    checkId: string;
    amount: number;
    customerName?: string;
    customerCpf?: string;
  },
  employeeId: string | null,
  unitId: string,
) {
  await validateCheck(prisma, input.checkId, unitId, input.amount);

  // Find DIGITAL cash register for this unit
  const digitalRegister = await prisma.cashRegister.findFirst({
    where: { unitId, type: 'DIGITAL', status: 'OPEN' },
  });

  const pagarme = getPagarmeService();
  const amountCents = Math.round(input.amount * 100);

  const order = await pagarme.createPixOrder({
    amountCents,
    description: `Conta - OASYS`,
    referenceCode: `check_${input.checkId}`,
    customerName: input.customerName,
    customerCpf: input.customerCpf,
  });

  const qrCode =
    order.charges?.[0]?.last_transaction?.qr_code ?? null;
  const qrCodeUrl =
    order.charges?.[0]?.last_transaction?.qr_code_url ?? null;

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // +30 min

  const payment = await prisma.payment.create({
    data: {
      checkId: input.checkId,
      employeeId,
      method: 'PIX',
      amount: input.amount,
      status: 'PENDING',
      externalId: order.id,
      pixQrCode: qrCode,
      pixQrCodeBase64: qrCodeUrl, // Pagar.me provides URL to QR image
      expiresAt,
      cashRegisterId: digitalRegister?.id ?? null,
    },
  });

  return {
    ...payment,
    amount: Number(payment.amount),
  };
}

// ── Card Payment (Online Link) ──────────────────────────────────────
export async function createCardPayment(
  prisma: PrismaClient,
  input: {
    checkId: string;
    amount: number;
    customerName?: string;
    customerEmail?: string;
  },
  employeeId: string | null,
  unitId: string,
) {
  await validateCheck(prisma, input.checkId, unitId, input.amount);

  const digitalRegister = await prisma.cashRegister.findFirst({
    where: { unitId, type: 'DIGITAL', status: 'OPEN' },
  });

  const pagarme = getPagarmeService();
  const amountCents = Math.round(input.amount * 100);

  const order = await pagarme.createCardCheckout({
    amountCents,
    description: `Conta - OASYS`,
    referenceCode: `check_${input.checkId}`,
    successUrl: `${process.env.WEB_MENU_URL ?? 'https://app.oasys.com.br'}/payment/success`,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
  });

  const paymentUrl = order.checkouts?.[0]?.payment_url ?? null;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // +60 min

  const payment = await prisma.payment.create({
    data: {
      checkId: input.checkId,
      employeeId,
      method: 'CREDIT_CARD',
      amount: input.amount,
      status: 'PENDING',
      externalId: order.id,
      paymentUrl,
      expiresAt,
      cashRegisterId: digitalRegister?.id ?? null,
    },
  });

  return {
    ...payment,
    amount: Number(payment.amount),
  };
}

// ── Get Payments by Check ───────────────────────────────────────────
export async function getPaymentsByCheck(
  prisma: PrismaClient,
  checkId: string,
  unitId: string,
) {
  const check = await prisma.check.findUnique({
    where: { id: checkId },
    select: { unitId: true },
  });

  if (!check) throw AppError.notFound('Conta não encontrada');
  if (check.unitId !== unitId)
    throw AppError.forbidden('Conta não pertence a esta unidade');

  return prisma.payment.findMany({
    where: { checkId },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Get Payment by ID ───────────────────────────────────────────────
export async function getPaymentById(
  prisma: PrismaClient,
  paymentId: string,
  unitId: string,
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { check: { select: { unitId: true } } },
  });

  if (!payment) throw AppError.notFound('Pagamento não encontrado');
  if (payment.check.unitId !== unitId)
    throw AppError.forbidden('Pagamento não pertence a esta unidade');

  const { check: _, ...paymentData } = payment;
  return paymentData;
}

// ── Payment Summary ─────────────────────────────────────────────────
export async function getPaymentSummary(
  prisma: PrismaClient,
  checkId: string,
  unitId: string,
) {
  const check = await prisma.check.findUnique({
    where: { id: checkId },
    include: {
      orders: { include: { items: true } },
      payments: true,
      unit: { select: { serviceFeeRate: true } },
    },
  });

  if (!check) throw AppError.notFound('Conta não encontrada');
  if (check.unitId !== unitId)
    throw AppError.forbidden('Conta não pertence a esta unidade');

  const confirmedPayments = check.payments.filter(
    (p) => p.status === 'CONFIRMED',
  );

  const { itemsTotal, serviceFee, tip, discount, grossTotal } =
    calculateCheckTotals({
      ...check,
      payments: confirmedPayments,
    });

  const totalPaid = confirmedPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );

  const breakdown: Record<string, number> = {};
  for (const p of confirmedPayments) {
    const method = p.method;
    breakdown[method] = (breakdown[method] ?? 0) + Number(p.amount);
  }

  return {
    checkId,
    checkTotal: itemsTotal,
    serviceFeeAmount: serviceFee,
    tipAmount: tip,
    discountAmount: discount,
    grossTotal,
    totalPaid,
    remainingBalance: Math.max(0, grossTotal - totalPaid),
    isPaid: grossTotal - totalPaid <= 0.01,
    payments: check.payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    })),
    breakdown,
  };
}

// ── Refund Payment ──────────────────────────────────────────────────
export async function refundPayment(
  prisma: PrismaClient,
  paymentId: string,
  unitId: string,
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { check: { select: { unitId: true, id: true } } },
  });

  if (!payment) throw AppError.notFound('Pagamento não encontrado');
  if (payment.check.unitId !== unitId)
    throw AppError.forbidden('Pagamento não pertence a esta unidade');
  if (payment.status !== 'CONFIRMED')
    throw AppError.badRequest('Apenas pagamentos confirmados podem ser estornados');

  const updatedPayment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'REFUNDED' },
  });

  // Re-open check if it was marked as PAID
  const check = await prisma.check.findUnique({
    where: { id: payment.checkId },
  });
  if (check?.status === 'PAID') {
    await prisma.check.update({
      where: { id: payment.checkId },
      data: { status: 'OPEN', closedAt: null },
    });
  }

  return { ...updatedPayment, amount: Number(updatedPayment.amount) };
}
