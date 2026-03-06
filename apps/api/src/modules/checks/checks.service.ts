import type { PrismaClient } from '@oasys/database';
import { AppError } from '../../lib/errors';
import type {
  SplitEqualInput,
  SplitByItemsInput,
  SplitCustomInput,
  MergeChecksInput,
  TransferItemsInput,
  ApplyDiscountInput,
  UpdateServiceFeeInput,
} from './checks.schemas';

// ── Shared: Calculate Check Totals ──────────────────────────────────
export function calculateCheckTotals(check: {
  orders: Array<{ items: Array<{ unitPrice: unknown; quantity: number }> }>;
  payments: Array<{ amount: unknown; status: string }>;
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

  const confirmedPayments = check.payments.filter(
    (p) => p.status === 'CONFIRMED',
  );
  const totalPaid = confirmedPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );

  return {
    itemsTotal,
    serviceFee,
    tip,
    discount,
    grossTotal,
    totalPaid,
    remainingBalance: Math.max(0, grossTotal - totalPaid),
  };
}

// ── Helper: Load check with full data ───────────────────────────────
async function loadCheckFull(prisma: PrismaClient, checkId: string, unitId: string) {
  const check = await prisma.check.findUnique({
    where: { id: checkId },
    include: {
      orders: { include: { items: { include: { product: { select: { name: true } } } } } },
      payments: true,
      unit: { select: { serviceFeeRate: true } },
      table: { select: { id: true, number: true, zone: { select: { name: true } } } },
      splitChildren: { select: { id: true, status: true } },
    },
  });

  if (!check) throw AppError.notFound('Conta não encontrada');
  if (check.unitId !== unitId) throw AppError.forbidden('Conta não pertence a esta unidade');

  return check;
}

// ── GET Check Detail ────────────────────────────────────────────────
export async function getCheckDetail(
  prisma: PrismaClient,
  checkId: string,
  unitId: string,
) {
  const check = await loadCheckFull(prisma, checkId, unitId);
  const totals = calculateCheckTotals(check);

  const duration = Date.now() - check.openedAt.getTime();
  const hours = Math.floor(duration / 3600000);
  const minutes = Math.floor((duration % 3600000) / 60000);
  const durationStr = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

  return {
    id: check.id,
    tableNumber: check.table?.number ?? null,
    zoneName: check.table?.zone?.name ?? null,
    status: check.status,
    openedAt: check.openedAt.toISOString(),
    duration: durationStr,
    orders: check.orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      source: order.source,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        modifiers: item.modifiers,
        notes: item.notes,
        isDelivered: item.isDelivered,
      })),
    })),
    financial: {
      itemsTotal: totals.itemsTotal,
      serviceFeeRate: check.unit.serviceFeeRate ? Number(check.unit.serviceFeeRate) : 0,
      serviceFeeAmount: totals.serviceFee,
      tipAmount: totals.tip,
      discountAmount: totals.discount,
      discountReason: check.discountReason,
      grossTotal: totals.grossTotal,
      totalPaid: totals.totalPaid,
      remainingBalance: totals.remainingBalance,
      isPaid: totals.remainingBalance <= 0.01,
    },
    payments: check.payments.map((p) => ({
      id: p.id,
      method: p.method,
      amount: Number(p.amount),
      status: p.status,
      paidAt: p.paidAt?.toISOString() ?? p.createdAt.toISOString(),
    })),
    splitChildren: check.splitChildren.map((c) => ({
      id: c.id,
      status: c.status,
    })),
  };
}

// ── Split Equal ─────────────────────────────────────────────────────
export async function splitEqual(
  prisma: PrismaClient,
  checkId: string,
  unitId: string,
  employeeId: string,
  input: SplitEqualInput,
) {
  const check = await loadCheckFull(prisma, checkId, unitId);

  if (check.status !== 'OPEN') {
    throw AppError.badRequest('Conta deve estar aberta para dividir');
  }
  if (check.splitParentId) {
    throw AppError.badRequest('Não é possível dividir uma conta que já é filha de outra');
  }

  const totals = calculateCheckTotals(check);
  const balance = totals.remainingBalance;
  if (balance <= 0) throw AppError.badRequest('Conta não tem saldo restante');

  const baseAmount = Math.floor((balance / input.numberOfPeople) * 100) / 100;
  const remainder = Math.round((balance - baseAmount * input.numberOfPeople) * 100) / 100;

  const serviceFeeBase = input.includeServiceFee ? totals.serviceFee : 0;
  const feePerPerson = input.includeServiceFee
    ? Math.floor((serviceFeeBase / input.numberOfPeople) * 100) / 100
    : 0;

  return prisma.$transaction(async (tx) => {
    const splitChecks = [];
    for (let i = 0; i < input.numberOfPeople; i++) {
      const isLast = i === input.numberOfPeople - 1;
      const amount = isLast ? baseAmount + remainder : baseAmount;
      const fee = isLast ? serviceFeeBase - feePerPerson * (input.numberOfPeople - 1) : feePerPerson;

      const splitCheck = await tx.check.create({
        data: {
          unitId,
          tableId: check.tableId,
          employeeId,
          status: 'OPEN',
          splitParentId: checkId,
          serviceFeeAmount: input.includeServiceFee ? fee : null,
          totalAmount: amount,
        },
      });
      splitChecks.push({
        id: splitCheck.id,
        splitParentId: checkId,
        label: `Pessoa ${i + 1}`,
        total: amount,
        serviceFee: fee,
        grossTotal: amount + fee,
        status: 'OPEN',
      });
    }

    // Parent becomes SPLIT
    await tx.check.update({
      where: { id: checkId },
      data: { status: 'SPLIT' },
    });

    return {
      originalCheckId: checkId,
      splitChecks,
      totalSplit: balance,
      originalTotal: totals.grossTotal,
    };
  });
}

// ── Split By Items ──────────────────────────────────────────────────
export async function splitByItems(
  prisma: PrismaClient,
  checkId: string,
  unitId: string,
  employeeId: string,
  input: SplitByItemsInput,
) {
  const check = await loadCheckFull(prisma, checkId, unitId);

  if (check.status !== 'OPEN') {
    throw AppError.badRequest('Conta deve estar aberta para dividir');
  }
  if (check.splitParentId) {
    throw AppError.badRequest('Não é possível dividir uma conta que já é filha de outra');
  }

  // Build item map: orderItemId -> { price, maxQty }
  const itemMap = new Map<string, { unitPrice: number; maxQuantity: number }>();
  for (const order of check.orders) {
    for (const item of order.items) {
      itemMap.set(item.id, {
        unitPrice: Number(item.unitPrice),
        maxQuantity: item.quantity,
      });
    }
  }

  // Validate all items are assigned and quantities don't exceed
  const assignedQuantities = new Map<string, number>();
  for (const split of input.splits) {
    for (const item of split.items) {
      if (!itemMap.has(item.orderItemId)) {
        throw AppError.badRequest(`Item ${item.orderItemId} não encontrado na conta`);
      }
      const current = assignedQuantities.get(item.orderItemId) ?? 0;
      assignedQuantities.set(item.orderItemId, current + item.quantity);
    }
  }

  // Check all items are assigned
  const unassigned: string[] = [];
  for (const [itemId, info] of itemMap) {
    const assigned = assignedQuantities.get(itemId) ?? 0;
    if (assigned < info.maxQuantity) {
      unassigned.push(itemId);
    }
    if (assigned > info.maxQuantity) {
      throw AppError.badRequest(
        `Quantidade atribuída para item excede disponível (max: ${info.maxQuantity})`,
      );
    }
  }
  if (unassigned.length > 0) {
    throw AppError.badRequest(`Itens não atribuídos: ${unassigned.length} item(s) sem atribuição`);
  }

  const serviceFeeRate = input.includeServiceFee && check.unit.serviceFeeRate
    ? Number(check.unit.serviceFeeRate)
    : 0;

  return prisma.$transaction(async (tx) => {
    const splitChecks = [];
    for (const split of input.splits) {
      const splitTotal = split.items.reduce((sum, item) => {
        const info = itemMap.get(item.orderItemId)!;
        return sum + info.unitPrice * item.quantity;
      }, 0);
      const fee = splitTotal * serviceFeeRate;

      const splitCheck = await tx.check.create({
        data: {
          unitId,
          tableId: check.tableId,
          employeeId,
          status: 'OPEN',
          splitParentId: checkId,
          serviceFeeAmount: input.includeServiceFee ? fee : null,
          totalAmount: splitTotal,
        },
      });
      splitChecks.push({
        id: splitCheck.id,
        splitParentId: checkId,
        label: split.label,
        total: splitTotal,
        serviceFee: fee,
        grossTotal: splitTotal + fee,
        status: 'OPEN',
      });
    }

    await tx.check.update({
      where: { id: checkId },
      data: { status: 'SPLIT' },
    });

    return {
      originalCheckId: checkId,
      splitChecks,
    };
  });
}

// ── Split Custom ────────────────────────────────────────────────────
export async function splitCustom(
  prisma: PrismaClient,
  checkId: string,
  unitId: string,
  employeeId: string,
  input: SplitCustomInput,
) {
  const check = await loadCheckFull(prisma, checkId, unitId);

  if (check.status !== 'OPEN') {
    throw AppError.badRequest('Conta deve estar aberta para dividir');
  }
  if (check.splitParentId) {
    throw AppError.badRequest('Não é possível dividir uma conta que já é filha de outra');
  }

  const totals = calculateCheckTotals(check);
  const balance = totals.remainingBalance;

  const totalSplitAmount = input.splits.reduce((s, sp) => s + sp.amount, 0);
  if (totalSplitAmount < balance - 0.01) {
    throw AppError.badRequest(
      `Soma dos valores (R$${totalSplitAmount.toFixed(2)}) é menor que o saldo restante (R$${balance.toFixed(2)})`,
    );
  }

  return prisma.$transaction(async (tx) => {
    const splitChecks = [];
    for (const split of input.splits) {
      const splitCheck = await tx.check.create({
        data: {
          unitId,
          tableId: check.tableId,
          employeeId,
          status: 'OPEN',
          splitParentId: checkId,
          totalAmount: split.amount,
        },
      });
      splitChecks.push({
        id: splitCheck.id,
        splitParentId: checkId,
        label: split.label,
        total: split.amount,
        grossTotal: split.amount,
        status: 'OPEN',
      });
    }

    await tx.check.update({
      where: { id: checkId },
      data: { status: 'SPLIT' },
    });

    return {
      originalCheckId: checkId,
      splitChecks,
      totalSplit: totalSplitAmount,
      originalTotal: totals.grossTotal,
    };
  });
}

// ── Merge Checks ────────────────────────────────────────────────────
export async function mergeChecks(
  prisma: PrismaClient,
  targetCheckId: string,
  unitId: string,
  input: MergeChecksInput,
) {
  return prisma.$transaction(async (tx) => {
    const targetCheck = await tx.check.findUnique({
      where: { id: targetCheckId },
      include: { orders: true },
    });

    if (!targetCheck) throw AppError.notFound('Conta destino não encontrada');
    if (targetCheck.unitId !== unitId) throw AppError.forbidden('Conta não pertence a esta unidade');
    if (targetCheck.status !== 'OPEN') throw AppError.badRequest('Conta destino deve estar aberta');
    if (targetCheck.splitParentId) {
      throw AppError.badRequest('Não é possível juntar conta dividida');
    }

    let totalItemsMoved = 0;

    for (const sourceId of input.sourceCheckIds) {
      const sourceCheck = await tx.check.findUnique({
        where: { id: sourceId },
        include: { orders: true, payments: { where: { status: 'CONFIRMED' } } },
      });

      if (!sourceCheck) throw AppError.notFound(`Conta ${sourceId} não encontrada`);
      if (sourceCheck.unitId !== unitId) {
        throw AppError.forbidden('Conta não pertence a esta unidade');
      }
      if (sourceCheck.status !== 'OPEN') {
        throw AppError.badRequest('Conta fonte deve estar aberta para juntar');
      }
      if (sourceCheck.splitParentId) {
        throw AppError.badRequest('Não é possível juntar conta dividida');
      }

      // Move orders to target
      for (const order of sourceCheck.orders) {
        await tx.order.update({
          where: { id: order.id },
          data: { checkId: targetCheckId },
        });
        totalItemsMoved++;
      }

      // Move confirmed payments to target
      for (const payment of sourceCheck.payments) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { checkId: targetCheckId },
        });
      }

      // Close source
      await tx.check.update({
        where: { id: sourceId },
        data: { mergedIntoId: targetCheckId, status: 'CLOSED', closedAt: new Date() },
      });
    }

    // Recalculate target total
    const updatedTarget = await tx.check.findUnique({
      where: { id: targetCheckId },
      include: {
        orders: { include: { items: true } },
        payments: true,
        unit: { select: { serviceFeeRate: true } },
      },
    });

    const totals = calculateCheckTotals(updatedTarget!);

    return {
      targetCheckId,
      mergedChecks: input.sourceCheckIds,
      totalItemsMoved,
      newTotal: totals.grossTotal,
      message: `${input.sourceCheckIds.length} conta(s) juntada(s) com sucesso. ${totalItemsMoved} pedido(s) transferido(s).`,
    };
  });
}

// ── Transfer Items ──────────────────────────────────────────────────
export async function transferItems(
  prisma: PrismaClient,
  sourceCheckId: string,
  unitId: string,
  input: TransferItemsInput,
) {
  return prisma.$transaction(async (tx) => {
    const sourceCheck = await tx.check.findUnique({
      where: { id: sourceCheckId },
      include: { orders: { include: { items: true } } },
    });

    if (!sourceCheck) throw AppError.notFound('Conta fonte não encontrada');
    if (sourceCheck.unitId !== unitId) throw AppError.forbidden('Conta não pertence a esta unidade');
    if (sourceCheck.status !== 'OPEN') throw AppError.badRequest('Conta fonte deve estar aberta');

    const targetCheck = await tx.check.findUnique({
      where: { id: input.targetCheckId },
    });

    if (!targetCheck) throw AppError.notFound('Conta destino não encontrada');
    if (targetCheck.unitId !== unitId) throw AppError.forbidden('Conta destino não pertence a esta unidade');
    if (targetCheck.status !== 'OPEN') throw AppError.badRequest('Conta destino deve estar aberta');

    // Build item lookup
    const allItems = sourceCheck.orders.flatMap((o) => o.items);
    const itemById = new Map(allItems.map((item) => [item.id, item]));

    for (const transfer of input.items) {
      const item = itemById.get(transfer.orderItemId);
      if (!item) {
        throw AppError.badRequest(`Item ${transfer.orderItemId} não encontrado na conta fonte`);
      }
      if (transfer.quantity > item.quantity) {
        throw AppError.badRequest(
          `Quantidade excede disponível (max: ${item.quantity})`,
        );
      }

      if (transfer.quantity === item.quantity) {
        // Move entire item — find or create order in target check
        const targetOrder = await findOrCreateOrder(tx, input.targetCheckId, sourceCheck.employeeId);
        await tx.orderItem.update({
          where: { id: item.id },
          data: { orderId: targetOrder.id },
        });
      } else {
        // Partial transfer — reduce source, create new in target
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            quantity: item.quantity - transfer.quantity,
            totalPrice: Number(item.unitPrice) * (item.quantity - transfer.quantity),
          },
        });

        const targetOrder = await findOrCreateOrder(tx, input.targetCheckId, sourceCheck.employeeId);
        await tx.orderItem.create({
          data: {
            orderId: targetOrder.id,
            productId: item.productId,
            quantity: transfer.quantity,
            unitPrice: item.unitPrice,
            totalPrice: Number(item.unitPrice) * transfer.quantity,
            notes: item.notes,
            modifiers: item.modifiers ?? undefined,
          },
        });
      }
    }

    return {
      sourceCheckId,
      targetCheckId: input.targetCheckId,
      itemsTransferred: input.items.length,
      message: `${input.items.length} item(s) transferido(s) com sucesso.`,
    };
  });
}

// Helper: find or create a transfer order in a check
async function findOrCreateOrder(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  checkId: string,
  employeeId: string,
) {
  // Look for an existing transfer order
  const existing = await tx.order.findFirst({
    where: { checkId, source: 'TRANSFER' },
  });
  if (existing) return existing;

  return tx.order.create({
    data: {
      checkId,
      employeeId,
      status: 'DELIVERED',
      source: 'TRANSFER',
    },
  });
}

// ── Apply Discount ──────────────────────────────────────────────────
export async function applyDiscount(
  prisma: PrismaClient,
  checkId: string,
  unitId: string,
  employeeId: string,
  input: ApplyDiscountInput,
) {
  const check = await loadCheckFull(prisma, checkId, unitId);

  if (check.status !== 'OPEN') {
    throw AppError.badRequest('Conta deve estar aberta para aplicar desconto');
  }

  const totals = calculateCheckTotals(check);
  let discountAmount: number;

  if (input.type === 'PERCENTAGE') {
    discountAmount = totals.itemsTotal * (input.value / 100);
  } else {
    discountAmount = input.value;
  }

  if (discountAmount > totals.remainingBalance) {
    throw AppError.badRequest('Desconto excede saldo restante');
  }

  // Check if discount > 15% and needs authorization
  const discountPercent = (discountAmount / totals.itemsTotal) * 100;
  if (discountPercent > 15 && !input.authorizedBy) {
    throw AppError.forbidden('Desconto acima de 15% requer autorização do gerente');
  }

  await prisma.check.update({
    where: { id: checkId },
    data: {
      discountAmount: discountAmount,
      discountReason: input.reason,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      unitId,
      employeeId,
      action: 'DISCOUNT_APPLIED',
      entity: 'Check',
      entityId: checkId,
      after: {
        type: input.type,
        value: input.value,
        discountAmount,
        reason: input.reason,
        authorizedBy: input.authorizedBy ?? null,
      },
    },
  });

  return {
    checkId,
    discountType: input.type,
    discountValue: input.value,
    discountAmount,
    reason: input.reason,
    message: `Desconto de R$ ${discountAmount.toFixed(2)} aplicado com sucesso.`,
  };
}

// ── Update Service Fee ──────────────────────────────────────────────
export async function updateServiceFee(
  prisma: PrismaClient,
  checkId: string,
  unitId: string,
  input: UpdateServiceFeeInput,
) {
  const check = await prisma.check.findUnique({
    where: { id: checkId },
    select: { id: true, unitId: true, status: true },
  });

  if (!check) throw AppError.notFound('Conta não encontrada');
  if (check.unitId !== unitId) throw AppError.forbidden('Conta não pertence a esta unidade');
  if (check.status !== 'OPEN') throw AppError.badRequest('Conta deve estar aberta');

  await prisma.check.update({
    where: { id: checkId },
    data: { serviceFeeAmount: input.serviceFeeAmount },
  });

  return {
    checkId,
    serviceFeeAmount: input.serviceFeeAmount,
    message: input.serviceFeeAmount === 0
      ? 'Taxa de serviço removida.'
      : `Taxa de serviço atualizada para R$ ${input.serviceFeeAmount.toFixed(2)}.`,
  };
}
