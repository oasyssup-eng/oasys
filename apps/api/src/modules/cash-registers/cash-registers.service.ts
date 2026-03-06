import type { PrismaClient, Prisma } from '@oasys/database';
import { AppError } from '../../lib/errors';

// ── Open Cash Register ─────────────────────────────────────────────
export async function openCashRegister(
  prisma: PrismaClient,
  input: { openingBalance: number; type: string },
  employeeId: string,
  unitId: string,
) {
  // Validate: one OPEN register per operator
  if (input.type === 'OPERATOR') {
    const existing = await prisma.cashRegister.findFirst({
      where: { employeeId, status: 'OPEN' },
    });
    if (existing) {
      throw AppError.conflict('Você já tem um caixa aberto');
    }
  }

  // Validate: one DIGITAL per unit
  if (input.type === 'DIGITAL') {
    const existing = await prisma.cashRegister.findFirst({
      where: { unitId, type: 'DIGITAL', status: 'OPEN' },
    });
    if (existing) {
      throw AppError.conflict('Já existe um caixa digital aberto para esta unidade');
    }
  }

  const register = await prisma.cashRegister.create({
    data: {
      unitId,
      employeeId: input.type === 'OPERATOR' ? employeeId : null,
      type: input.type,
      status: 'OPEN',
      openingBalance: input.openingBalance,
    },
  });

  return register;
}

// ── Get Active Cash Register ────────────────────────────────────────
export async function getActiveCashRegister(
  prisma: PrismaClient,
  employeeId: string,
  unitId: string,
) {
  // First try operator register for this employee
  const operatorRegister = await prisma.cashRegister.findFirst({
    where: { employeeId, status: 'OPEN', type: 'OPERATOR' },
    include: { operations: { orderBy: { createdAt: 'desc' } } },
  });

  if (operatorRegister) return operatorRegister;

  // Fall back to unit's digital register
  const digitalRegister = await prisma.cashRegister.findFirst({
    where: { unitId, status: 'OPEN', type: 'DIGITAL' },
    include: { operations: { orderBy: { createdAt: 'desc' } } },
  });

  return digitalRegister;
}

// ── Create Operation (Withdrawal/Supply/Adjustment) ─────────────────
export async function createOperation(
  prisma: PrismaClient,
  cashRegisterId: string,
  input: { type: string; amount: number; reason: string; authorizedBy?: string },
  employeeId: string,
  unitId: string,
) {
  const register = await prisma.cashRegister.findUnique({
    where: { id: cashRegisterId },
  });

  if (!register) {
    throw AppError.notFound('Caixa não encontrado');
  }

  if (register.unitId !== unitId) {
    throw AppError.forbidden('Caixa não pertence a esta unidade');
  }

  if (register.status !== 'OPEN') {
    throw AppError.badRequest('Caixa não está aberto');
  }

  // Withdrawal > R$200 requires authorization
  if (input.type === 'WITHDRAWAL' && input.amount > 200 && !input.authorizedBy) {
    throw AppError.forbidden('Sangria acima de R$200 requer autorização do gerente');
  }

  const operation = await prisma.cashRegisterOperation.create({
    data: {
      cashRegisterId,
      type: input.type,
      amount: input.amount,
      reason: input.reason,
      employeeId,
      authorizedBy: input.authorizedBy ?? null,
    },
  });

  return operation;
}

// ── Close Cash Register ─────────────────────────────────────────────
export async function closeCashRegister(
  prisma: PrismaClient,
  cashRegisterId: string,
  input: { closingBalance: number; closingNotes?: string },
  unitId: string,
) {
  const register = await prisma.cashRegister.findUnique({
    where: { id: cashRegisterId },
    include: {
      operations: true,
      payments: { where: { status: 'CONFIRMED', method: 'CASH' } },
    },
  });

  if (!register) {
    throw AppError.notFound('Caixa não encontrado');
  }

  if (register.unitId !== unitId) {
    throw AppError.forbidden('Caixa não pertence a esta unidade');
  }

  if (register.status !== 'OPEN') {
    throw AppError.badRequest('Caixa não está aberto');
  }

  // Calculate expected balance
  const openingBalance = Number(register.openingBalance);
  const totalCashIn = register.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );
  const totalWithdrawals = register.operations
    .filter((op) => op.type === 'WITHDRAWAL')
    .reduce((sum, op) => sum + Number(op.amount), 0);
  const totalSupplies = register.operations
    .filter((op) => op.type === 'SUPPLY')
    .reduce((sum, op) => sum + Number(op.amount), 0);
  const totalAdjustments = register.operations
    .filter((op) => op.type === 'ADJUSTMENT')
    .reduce((sum, op) => sum + Number(op.amount), 0);

  const expectedBalance =
    openingBalance + totalCashIn - totalWithdrawals + totalSupplies + totalAdjustments;
  const difference = input.closingBalance - expectedBalance;

  // Check for pending payments
  const pendingPayments = await prisma.payment.count({
    where: { cashRegisterId, status: 'PENDING' },
  });

  const updatedRegister = await prisma.cashRegister.update({
    where: { id: cashRegisterId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      closingBalance: input.closingBalance,
      expectedBalance,
      difference,
      closingNotes: input.closingNotes ?? null,
    },
  });

  // Create alert if difference > R$50
  if (Math.abs(difference) > 50) {
    await prisma.alert.create({
      data: {
        unitId,
        type: 'CASH_REGISTER_OPEN',
        severity: 'CRITICAL',
        message: `Diferença de R$ ${Math.abs(difference).toFixed(2)} no fechamento do caixa. ${difference < 0 ? 'Falta' : 'Sobra'} de dinheiro.`,
        metadata: {
          cashRegisterId,
          expectedBalance,
          closingBalance: input.closingBalance,
          difference,
        } satisfies Prisma.JsonObject,
      },
    });
  }

  return {
    ...updatedRegister,
    summary: {
      totalCashIn,
      totalWithdrawals,
      totalSupplies,
      transactionCount: register.payments.length,
    },
    pendingPaymentsWarning:
      pendingPayments > 0
        ? `${pendingPayments} pagamentos pendentes de confirmação`
        : undefined,
  };
}

// ── Get Cash Register Detail ────────────────────────────────────────
export async function getCashRegisterById(
  prisma: PrismaClient,
  cashRegisterId: string,
  unitId: string,
) {
  const register = await prisma.cashRegister.findUnique({
    where: { id: cashRegisterId },
    include: {
      operations: { orderBy: { createdAt: 'desc' } },
      payments: { orderBy: { createdAt: 'desc' } },
      employee: { select: { id: true, name: true, role: true } },
    },
  });

  if (!register) {
    throw AppError.notFound('Caixa não encontrado');
  }

  if (register.unitId !== unitId) {
    throw AppError.forbidden('Caixa não pertence a esta unidade');
  }

  return register;
}

// ── List Cash Registers ─────────────────────────────────────────────
export async function listCashRegisters(
  prisma: PrismaClient,
  unitId: string,
  filters: {
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    status?: string;
    limit: number;
    offset: number;
  },
) {
  const where: Prisma.CashRegisterWhereInput = { unitId };

  if (filters.status) {
    where.status = filters.status as Prisma.EnumCashRegisterStatusFilter;
  }

  if (filters.employeeId) {
    where.employeeId = filters.employeeId;
  }

  if (filters.startDate || filters.endDate) {
    where.openedAt = {};
    if (filters.startDate) where.openedAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.openedAt.lte = new Date(filters.endDate);
  }

  const [items, total] = await Promise.all([
    prisma.cashRegister.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true } },
      },
      orderBy: { openedAt: 'desc' },
      take: filters.limit,
      skip: filters.offset,
    }),
    prisma.cashRegister.count({ where }),
  ]);

  return { items, total };
}

// ── Cash Register Report ────────────────────────────────────────────
export async function getCashRegisterReport(
  prisma: PrismaClient,
  cashRegisterId: string,
  unitId: string,
) {
  const register = await prisma.cashRegister.findUnique({
    where: { id: cashRegisterId },
    include: {
      operations: { orderBy: { createdAt: 'asc' } },
      payments: {
        where: { status: 'CONFIRMED', method: 'CASH' },
        orderBy: { createdAt: 'asc' },
      },
      employee: { select: { id: true, name: true, role: true } },
    },
  });

  if (!register) {
    throw AppError.notFound('Caixa não encontrado');
  }

  if (register.unitId !== unitId) {
    throw AppError.forbidden('Caixa não pertence a esta unidade');
  }

  const totalCashIn = register.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );
  const totalWithdrawals = register.operations
    .filter((op) => op.type === 'WITHDRAWAL')
    .reduce((sum, op) => sum + Number(op.amount), 0);
  const totalSupplies = register.operations
    .filter((op) => op.type === 'SUPPLY')
    .reduce((sum, op) => sum + Number(op.amount), 0);

  return {
    ...register,
    summary: {
      totalCashIn,
      totalWithdrawals,
      totalSupplies,
      transactionCount: register.payments.length,
    },
  };
}
