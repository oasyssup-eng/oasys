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

  const item = await prisma.stockItem.create({
    data: {
      unitId,
      name: input.name,
      sku: input.sku,
      unitType: input.unitType,
      quantity: input.quantity ?? 0,
      minQuantity: input.minQuantity,
      costPrice: input.costPrice,
      supplierId: input.supplierId,
    },
  });

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
      ...(input.unitType !== undefined && { unitType: input.unitType }),
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
  const [totalItems, activeItems, allItems, recentMovements, alerts] = await Promise.all([
    prisma.stockItem.count({ where: { unitId } }),
    prisma.stockItem.count({ where: { unitId, isActive: true } }),
    prisma.stockItem.findMany({
      where: { unitId, isActive: true },
      select: { quantity: true, costPrice: true, minQuantity: true },
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
  ]);

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

  return {
    totalItems,
    activeItems,
    belowMinCount,
    totalValue,
    unresolvedAlerts: alerts,
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
  const items = await prisma.stockItem.findMany({
    where: {
      unitId,
      isActive: true,
      minQuantity: { not: null },
    },
    orderBy: { name: 'asc' },
  });

  return items
    .filter((item) => Number(item.quantity) <= Number(item.minQuantity))
    .map((item) => ({
      ...formatItem(item),
      deficit: Number(item.minQuantity) - Number(item.quantity),
    }));
}
