import type { PrismaClient } from '@prisma/client';

export interface CMVResult {
  totalCost: number;
  netRevenue: number;
  cmvPercentage: number;
  topCostItems: Array<{
    stockItemId: string;
    stockItemName: string;
    totalCost: number;
    totalQuantity: number;
    unitType: string;
  }>;
  startDate: string;
  endDate: string;
}

/**
 * Calculates theoretical CMV (Custo de Mercadoria Vendida) for a date range.
 * Theoretical CMV = SUM(OUT movements cost * quantity) / net revenue × 100
 */
export async function calculateCMV(
  prisma: PrismaClient,
  unitId: string,
  startDate: string,
  endDate: string,
): Promise<CMVResult> {
  const start = new Date(startDate + 'T00:00:00.000Z');
  const end = new Date(endDate + 'T23:59:59.999Z');

  // Get all OUT movements in the date range (sales deductions)
  const outMovements = await prisma.stockMovement.findMany({
    where: {
      stockItem: { unitId },
      type: 'OUT',
      createdAt: { gte: start, lte: end },
    },
    include: {
      stockItem: { select: { id: true, name: true, unitType: true } },
    },
  });

  // Calculate total cost and per-item costs
  const itemCosts = new Map<
    string,
    { name: string; totalCost: number; totalQuantity: number; unitType: string }
  >();

  let totalCost = 0;

  for (const mov of outMovements) {
    const qty = Number(mov.quantity);
    const cost = mov.costPrice ? Number(mov.costPrice) : 0;
    const movCost = qty * cost;
    totalCost += movCost;

    const existing = itemCosts.get(mov.stockItemId);
    if (existing) {
      existing.totalCost += movCost;
      existing.totalQuantity += qty;
    } else {
      itemCosts.set(mov.stockItemId, {
        name: mov.stockItem.name,
        totalCost: movCost,
        totalQuantity: qty,
        unitType: mov.stockItem.unitType,
      });
    }
  }

  // Get net revenue from DailyReports in the date range
  const reports = await prisma.dailyReport.findMany({
    where: {
      unitId,
      date: { gte: start, lte: end },
    },
    select: { netRevenue: true },
  });

  let netRevenue = 0;
  for (const report of reports) {
    if (report.netRevenue) {
      netRevenue += Number(report.netRevenue);
    }
  }

  // CMV percentage
  const cmvPercentage = netRevenue > 0 ? (totalCost / netRevenue) * 100 : 0;

  // Top cost items sorted by total cost descending
  const topCostItems = [...itemCosts.entries()]
    .map(([stockItemId, data]) => ({
      stockItemId,
      stockItemName: data.name,
      totalCost: data.totalCost,
      totalQuantity: data.totalQuantity,
      unitType: data.unitType,
    }))
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 10);

  return {
    totalCost,
    netRevenue,
    cmvPercentage: Math.round(cmvPercentage * 100) / 100,
    topCostItems,
    startDate,
    endDate,
  };
}
