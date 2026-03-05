import type { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../../lib/errors';
import type {
  CreateStockItemInput,
  UpdateStockItemInput,
  StockItemQuery,
  CreateMovementInput,
  MovementHistoryQuery,
} from './stock.schemas';
import { checkAndDisableProducts, checkAndRestoreProducts } from './availability.service';

// ── Helpers ──────────────────────────────────────────────────────────

function toNumber(value: Prisma.Decimal | null | undefined): number | null {
  if (value == null) return null;
  return Number(value);
}

function toNumberRequired(value: Prisma.Decimal): number {
  return Number(value);
}

function formatItem(item: {
  id: string;
  unitId: string;
  name: string;
  sku: string | null;
  quantity: Prisma.Decimal;
  unitType: string;
  minQuantity: Prisma.Decimal | null;
  costPrice: Prisma.Decimal | null;
  supplierId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item.id,
    unitId: item.unitId,
    name: item.name,
    sku: item.sku,
    quantity: toNumberRequired(item.quantity),
    unitType: item.unitType,
    minQuantity: toNumber(item.minQuantity),
    costPrice: toNumber(item.costPrice),
    supplierId: item.supplierId,
    isActive: item.isActive,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

// ── CRUD: Stock Items ───────────────────────────────────────────────

export async function createStockItem(
  prisma: PrismaClient,
  unitId: string,
  input: CreateStockItemInput,
) {
  // Check SKU uniqueness if provided (@@unique handled by DB, but nice error message)
  if (input.sku) {
    const existing = await prisma.stockItem.findUnique({
      where: { unitId_sku: { unitId, sku: input.sku } },
    });
    if (existing) {
      throw AppError.conflict(`SKU "${input.sku}" já está em uso nesta unidade`);
    }
  }

  const initialQty = input.quantity ?? 0;

  const item = await prisma.stockItem.create({
    data: {
      unitId,
      name: input.name,
      sku: input.sku,
      unitType: input.unitType,
      quantity: initialQty,
      minQuantity: input.minQuantity,
      costPrice: input.costPrice,
      supplierId: input.supplierId,
    },
  });

  // Gap 1: Auto-create IN movement when initial quantity > 0
  if (initialQty > 0) {
    await prisma.stockMovement.create({
      data: {
        stockItemId: item.id,
        type: 'IN',
        quantity: initialQty,
        reason: 'Estoque inicial',
        costPrice: input.costPrice,
      },
    });
  }

  return formatItem(item);
}

export async function updateStockItem(
  prisma: PrismaClient,
  itemId: string,
  unitId: string,
  input: UpdateStockItemInput,
) {
  const existing = await prisma.stockItem.findUnique({
    where: { id: itemId },
  });
  if (!existing || existing.unitId !== unitId) {
    throw AppError.notFound('Item de estoque não encontrado');
  }

  // Check SKU uniqueness if changing
  if (input.sku !== undefined && input.sku !== null && input.sku !== existing.sku) {
    const conflict = await prisma.stockItem.findUnique({
      where: { unitId_sku: { unitId, sku: input.sku } },
    });
    if (conflict && conflict.id !== itemId) {
      throw AppError.conflict(`SKU "${input.sku}" já está em uso nesta unidade`);
    }
  }

  const item = await prisma.stockItem.update({
    where: { id: itemId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.sku !== undefined && { sku: input.sku }),
      ...(input.minQuantity !== undefined && { minQuantity: input.minQuantity }),
      ...(input.costPrice !== undefined && { costPrice: input.costPrice }),
      ...(input.supplierId !== undefined && { supplierId: input.supplierId }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });

  return formatItem(item);
}

export async function listStockItems(
  prisma: PrismaClient,
  unitId: string,
  query: StockItemQuery,
) {
  const where: Prisma.StockItemWhereInput = { unitId };

  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { sku: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  // belowMin filter requires raw comparison
  if (query.belowMin) {
    where.AND = [
      { minQuantity: { not: null } },
      // Use raw query for Decimal comparison
    ];
  }

  const [items, total] = await Promise.all([
    prisma.stockItem.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: query.offset,
      take: query.limit,
    }),
    prisma.stockItem.count({ where }),
  ]);

  let formattedItems = items.map(formatItem);

  // Post-filter belowMin since Prisma can't compare two Decimal columns directly
  if (query.belowMin) {
    formattedItems = formattedItems.filter(
      (item) => item.minQuantity !== null && item.quantity <= item.minQuantity,
    );
  }

  return { items: formattedItems, total };
}

export async function getStockItem(
  prisma: PrismaClient,
  itemId: string,
  unitId: string,
) {
  const item = await prisma.stockItem.findUnique({
    where: { id: itemId },
    include: {
      movements: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { employee: { select: { name: true } } },
      },
      ingredients: {
        include: { product: { select: { id: true, name: true } } },
      },
    },
  });

  if (!item || item.unitId !== unitId) {
    throw AppError.notFound('Item de estoque não encontrado');
  }

  return {
    ...formatItem(item),
    movements: item.movements.map((m) => ({
      id: m.id,
      type: m.type,
      quantity: toNumberRequired(m.quantity),
      reason: m.reason,
      reference: m.reference,
      employeeName: m.employee?.name ?? null,
      costPrice: toNumber(m.costPrice),
      createdAt: m.createdAt.toISOString(),
    })),
    usedInProducts: item.ingredients.map((i) => ({
      productId: i.product.id,
      productName: i.product.name,
      quantityPerUnit: toNumberRequired(i.quantity),
    })),
  };
}

export async function deactivateStockItem(
  prisma: PrismaClient,
  itemId: string,
  unitId: string,
) {
  const existing = await prisma.stockItem.findUnique({
    where: { id: itemId },
  });
  if (!existing || existing.unitId !== unitId) {
    throw AppError.notFound('Item de estoque não encontrado');
  }

  // Gap 3: Block deactivation if item is used in active recipes
  const recipeCount = await prisma.productIngredient.count({
    where: { stockItemId: itemId },
  });
  if (recipeCount > 0) {
    throw AppError.badRequest(
      `Remova o insumo das fichas técnicas antes de desativar (usado em ${recipeCount} receita${recipeCount > 1 ? 's' : ''})`,
    );
  }

  const item = await prisma.stockItem.update({
    where: { id: itemId },
    data: { isActive: false },
  });

  return formatItem(item);
}

// ── Movements ───────────────────────────────────────────────────────

export async function createMovement(
  prisma: PrismaClient,
  unitId: string,
  input: CreateMovementInput,
  employeeId: string,
) {
  const stockItem = await prisma.stockItem.findUnique({
    where: { id: input.stockItemId },
  });
  if (!stockItem || stockItem.unitId !== unitId) {
    throw AppError.notFound('Item de estoque não encontrado');
  }

  const currentQty = Number(stockItem.quantity);
  let newQuantity: number;

  switch (input.type) {
    case 'IN':
      newQuantity = currentQty + input.quantity;
      break;
    case 'OUT':
    case 'LOSS':
    case 'TRANSFER':
      newQuantity = currentQty - input.quantity;
      break;
    case 'ADJUSTMENT':
      // Absolute set — the input.quantity IS the new quantity
      newQuantity = input.quantity;
      break;
    default:
      throw AppError.badRequest('Tipo de movimentação inválido');
  }

  // Store the actual quantity change as the movement quantity for ADJUSTMENT
  const movementQty =
    input.type === 'ADJUSTMENT' ? Math.abs(newQuantity - currentQty) : input.quantity;

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        stockItemId: input.stockItemId,
        type: input.type,
        quantity: movementQty,
        reason: input.reason,
        reference: input.reference,
        employeeId,
        costPrice: input.costPrice ?? stockItem.costPrice,
      },
    }),
    prisma.stockItem.update({
      where: { id: input.stockItemId },
      data: { quantity: newQuantity },
    }),
  ]);

  // Check for low stock alert
  const minQty = stockItem.minQuantity ? Number(stockItem.minQuantity) : null;
  if (minQty !== null && newQuantity <= minQty) {
    const severity = newQuantity <= 0 ? 'CRITICAL' : 'WARNING';
    await prisma.alert.create({
      data: {
        unitId,
        type: 'LOW_STOCK',
        severity,
        message:
          newQuantity <= 0
            ? `Estoque zerado: ${stockItem.name}`
            : `Estoque baixo: ${stockItem.name} (${newQuantity} ${stockItem.unitType})`,
        metadata: {
          stockItemId: stockItem.id,
          stockItemName: stockItem.name,
          currentQuantity: newQuantity,
          minQuantity: minQty,
        },
      },
    });
  }

  // Gap 4: Alert when adjustment diff > 10%
  if (input.type === 'ADJUSTMENT' && currentQty > 0) {
    const diff = Math.abs(newQuantity - currentQty);
    const pctDiff = diff / currentQty;
    if (pctDiff > 0.10) {
      await prisma.alert.create({
        data: {
          unitId,
          type: 'LOW_STOCK',
          severity: 'WARNING',
          message:
            `Ajuste de ${(pctDiff * 100).toFixed(1)}% no ${stockItem.name}. ` +
            `Sistema: ${currentQty}, Real: ${newQuantity}.`,
          metadata: {
            stockItemId: stockItem.id,
            stockItemName: stockItem.name,
            adjustmentPct: pctDiff * 100,
            systemQuantity: currentQty,
            actualQuantity: newQuantity,
          },
        },
      });
    }
  }

  // Gap 5: Alert when loss value > R$100
  if (input.type === 'LOSS') {
    const costPerUnit = input.costPrice ?? (stockItem.costPrice ? Number(stockItem.costPrice) : 0);
    const lossValue = input.quantity * costPerUnit;
    if (lossValue > 100) {
      await prisma.alert.create({
        data: {
          unitId,
          type: 'LOW_STOCK',
          severity: 'WARNING',
          message:
            `Perda significativa: ${stockItem.name} — ` +
            `${input.quantity} ${stockItem.unitType} (R$ ${lossValue.toFixed(2)})`,
          metadata: {
            stockItemId: stockItem.id,
            stockItemName: stockItem.name,
            lossQuantity: input.quantity,
            lossValue,
            reason: input.reason,
          },
        },
      });
    }
  }

  // Check product availability
  if (newQuantity <= 0) {
    await checkAndDisableProducts(prisma, input.stockItemId);
  } else if (input.type === 'IN' && currentQty <= 0) {
    // Was zero/negative, now positive — check if products can be restored
    await checkAndRestoreProducts(prisma, input.stockItemId);
  }

  return {
    id: movement.id,
    stockItemId: movement.stockItemId,
    type: movement.type,
    quantity: Number(movement.quantity),
    reason: movement.reason,
    reference: movement.reference,
    costPrice: toNumber(movement.costPrice),
    newStockQuantity: newQuantity,
    createdAt: movement.createdAt.toISOString(),
  };
}

export async function listMovements(
  prisma: PrismaClient,
  unitId: string,
  query: MovementHistoryQuery,
) {
  const where: Prisma.StockMovementWhereInput = {
    stockItem: { unitId },
  };

  if (query.stockItemId) {
    where.stockItemId = query.stockItemId;
  }
  if (query.type) {
    where.type = query.type;
  }
  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) {
      where.createdAt.gte = new Date(query.startDate + 'T00:00:00.000Z');
    }
    if (query.endDate) {
      where.createdAt.lte = new Date(query.endDate + 'T23:59:59.999Z');
    }
  }

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: query.offset,
      take: query.limit,
      include: {
        stockItem: { select: { name: true, unitType: true } },
        employee: { select: { name: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    movements: movements.map((m) => ({
      id: m.id,
      stockItemId: m.stockItemId,
      stockItemName: m.stockItem.name,
      unitType: m.stockItem.unitType,
      type: m.type,
      quantity: Number(m.quantity),
      reason: m.reason,
      reference: m.reference,
      employeeName: m.employee?.name ?? null,
      costPrice: toNumber(m.costPrice),
      createdAt: m.createdAt.toISOString(),
    })),
    total,
  };
}

// ── Dashboard ───────────────────────────────────────────────────────

export async function getStockDashboard(
  prisma: PrismaClient,
  unitId: string,
) {
  const now = new Date();
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalItems, activeItems, allItems, recentMovements, alerts, recentOutMovements, todayOutMovements] = await Promise.all([
    prisma.stockItem.count({ where: { unitId } }),
    prisma.stockItem.count({ where: { unitId, isActive: true } }),
    prisma.stockItem.findMany({
      where: { unitId, isActive: true },
      select: { id: true, name: true, quantity: true, costPrice: true, minQuantity: true, unitType: true },
    }),
    prisma.stockMovement.findMany({
      where: { stockItem: { unitId } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        stockItem: { select: { name: true, unitType: true } },
        employee: { select: { name: true } },
      },
    }),
    prisma.alert.count({
      where: { unitId, type: 'LOW_STOCK', isRead: false },
    }),
    // Gap 6: OUT movements in last 3h for estimatedRunout
    prisma.stockMovement.findMany({
      where: {
        stockItem: { unitId },
        type: 'OUT',
        createdAt: { gte: threeHoursAgo },
      },
      select: { stockItemId: true, quantity: true },
    }),
    // Gap 7: OUT movements today for topConsumed
    prisma.stockMovement.findMany({
      where: {
        stockItem: { unitId },
        type: 'OUT',
        createdAt: { gte: todayStart },
      },
      include: { stockItem: { select: { name: true, unitType: true, costPrice: true } } },
    }),
  ]);

  // Gap 6: Build consumption rate map (qty consumed per stockItemId in last 3h)
  const consumptionMap = new Map<string, number>();
  for (const m of recentOutMovements) {
    const existing = consumptionMap.get(m.stockItemId) ?? 0;
    consumptionMap.set(m.stockItemId, existing + Number(m.quantity));
  }

  let belowMinCount = 0;
  let totalValue = 0;

  for (const item of allItems) {
    const qty = Number(item.quantity);
    const cost = item.costPrice ? Number(item.costPrice) : 0;
    totalValue += qty * cost;

    if (item.minQuantity !== null && qty <= Number(item.minQuantity)) {
      belowMinCount++;
    }
  }

  // Gap 7: Aggregate top consumed items today
  const consumedMap = new Map<string, { name: string; unitType: string; consumed: number; cost: number }>();
  for (const m of todayOutMovements) {
    const qty = Number(m.quantity);
    const costPerUnit = m.costPrice ? Number(m.costPrice) : (m.stockItem.costPrice ? Number(m.stockItem.costPrice) : 0);
    const existing = consumedMap.get(m.stockItemId);
    if (existing) {
      existing.consumed += qty;
      existing.cost += qty * costPerUnit;
    } else {
      consumedMap.set(m.stockItemId, {
        name: m.stockItem.name,
        unitType: m.stockItem.unitType,
        consumed: qty,
        cost: qty * costPerUnit,
      });
    }
  }
  const topConsumed = Array.from(consumedMap.values())
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5)
    .map((c) => ({
      name: c.name,
      consumed: c.consumed,
      unit: c.unitType,
      cost: c.cost,
    }));

  return {
    totalItems,
    activeItems,
    belowMinCount,
    totalValue,
    unresolvedAlerts: alerts,
    topConsumed,
    recentMovements: recentMovements.map((m) => ({
      id: m.id,
      stockItemName: m.stockItem.name,
      unitType: m.stockItem.unitType,
      type: m.type,
      quantity: Number(m.quantity),
      reason: m.reason,
      employeeName: m.employee?.name ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

// ── Stock Alerts ────────────────────────────────────────────────────

export async function listStockAlerts(
  prisma: PrismaClient,
  unitId: string,
) {
  const alerts = await prisma.alert.findMany({
    where: { unitId, type: 'LOW_STOCK' },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return alerts.map((a) => ({
    id: a.id,
    severity: a.severity,
    message: a.message,
    metadata: a.metadata,
    isRead: a.isRead,
    createdAt: a.createdAt.toISOString(),
  }));
}

// ── Below Minimum ───────────────────────────────────────────────────

export async function listItemsBelowMinimum(
  prisma: PrismaClient,
  unitId: string,
) {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

  const [items, recentOutMovements] = await Promise.all([
    prisma.stockItem.findMany({
      where: {
        unitId,
        isActive: true,
        minQuantity: { not: null },
      },
      orderBy: { name: 'asc' },
    }),
    // Gap 6: OUT movements in last 3h for estimatedRunout
    prisma.stockMovement.findMany({
      where: {
        stockItem: { unitId },
        type: 'OUT',
        createdAt: { gte: threeHoursAgo },
      },
      select: { stockItemId: true, quantity: true },
    }),
  ]);

  // Build consumption rate map (qty consumed per hour over last 3h)
  const consumptionMap = new Map<string, number>();
  for (const m of recentOutMovements) {
    const existing = consumptionMap.get(m.stockItemId) ?? 0;
    consumptionMap.set(m.stockItemId, existing + Number(m.quantity));
  }

  return items
    .filter((item) => Number(item.quantity) <= Number(item.minQuantity))
    .map((item) => {
      const qty = Number(item.quantity);
      const consumed3h = consumptionMap.get(item.id) ?? 0;
      const consumptionPerHour = consumed3h / 3;
      let estimatedRunout: string | null = null;
      if (consumptionPerHour > 0 && qty > 0) {
        const hoursLeft = qty / consumptionPerHour;
        estimatedRunout = hoursLeft < 1
          ? `~${Math.round(hoursLeft * 60)}min`
          : `~${Math.round(hoursLeft)}h`;
      }

      return {
        ...formatItem(item),
        deficit: Number(item.minQuantity) - qty,
        estimatedRunout,
      };
    });
}
