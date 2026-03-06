import type { PrismaClient } from '@prisma/client';
import { getCurrentDay } from '../closing/closing.service';
import { calculateComparison } from '../closing/comparison';

// ── Dashboard Today ──────────────────────────────────────────────────

export async function getDashboardToday(
  prisma: PrismaClient,
  unitId: string,
  date?: string,
) {
  const currentDay = await getCurrentDay(prisma, unitId, date);

  // Top 5 products by revenue
  const today = date ?? new Date().toISOString().split('T')[0]!;
  const start = new Date(`${today}T00:00:00.000Z`);
  const end = new Date(`${today}T23:59:59.999Z`);

  const topProducts = await getTopProducts(prisma, unitId, start, end);

  // Payment breakdown with percentages
  const totalPayments = currentDay.paymentSummary.totalConfirmed;
  const paymentBreakdown = Object.entries(currentDay.paymentSummary.byMethod).map(
    ([method, amount]) => ({
      method,
      amount,
      percentage: totalPayments > 0 ? Math.round((amount / totalPayments) * 10000) / 100 : 0,
    }),
  );

  // Active alerts
  const alerts = await prisma.alert.findMany({
    where: {
      unitId,
      isRead: false,
      severity: { in: ['WARNING', 'CRITICAL'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      type: true,
      severity: true,
      message: true,
      createdAt: true,
    },
  });

  return {
    ...currentDay,
    topProducts,
    paymentBreakdown,
    alerts,
  };
}

// ── Dashboard Comparison ─────────────────────────────────────────────

export async function getDashboardComparison(
  prisma: PrismaClient,
  unitId: string,
  date?: string,
) {
  const today = date ?? new Date().toISOString().split('T')[0]!;
  const currentDay = await getCurrentDay(prisma, unitId, today);

  const comparison = await calculateComparison(
    prisma,
    unitId,
    today,
    currentDay.revenue.netRevenue,
    currentDay.operations.paidChecks,
  );

  // If there's a previous report, get its hourly data for overlay
  let previousHourly: { hour: number; revenue: number; orderCount: number; checkCount: number }[] = [];

  if (comparison) {
    const prevReport = await prisma.dailyReport.findUnique({
      where: {
        unitId_date: {
          unitId,
          date: new Date(comparison.previousDate),
        },
      },
      include: {
        hourlyRevenues: {
          orderBy: { hour: 'asc' },
          select: { hour: true, revenue: true, orderCount: true, checkCount: true },
        },
      },
    });

    if (prevReport) {
      previousHourly = prevReport.hourlyRevenues.map((h) => ({
        hour: h.hour,
        revenue: Number(h.revenue),
        orderCount: h.orderCount,
        checkCount: h.checkCount,
      }));
    }
  }

  return {
    current: {
      date: today,
      revenue: currentDay.revenue.netRevenue,
      checks: currentDay.operations.paidChecks,
      hourly: currentDay.hourlyData,
    },
    previous: comparison
      ? {
          date: comparison.previousDate,
          revenue: comparison.previousRevenue,
          checks: comparison.previousChecks,
          hourly: previousHourly,
        }
      : null,
    comparison,
  };
}

// ── Top Products Helper ──────────────────────────────────────────────

async function getTopProducts(
  prisma: PrismaClient,
  unitId: string,
  start: Date,
  end: Date,
  limit = 5,
) {
  // Get order items from paid checks in the period
  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        check: {
          unitId,
          status: 'PAID',
          closedAt: { gte: start, lt: end },
        },
        status: { not: 'CANCELLED' },
        isCortesia: false,
      },
    },
    select: {
      productId: true,
      quantity: true,
      totalPrice: true,
      product: { select: { name: true } },
    },
  });

  // Group by product
  const grouped = new Map<string, { name: string; quantity: number; revenue: number }>();

  for (const item of items) {
    const existing = grouped.get(item.productId);
    if (existing) {
      existing.quantity += item.quantity;
      existing.revenue += Number(item.totalPrice);
    } else {
      grouped.set(item.productId, {
        name: item.product.name,
        quantity: item.quantity,
        revenue: Number(item.totalPrice),
      });
    }
  }

  // Sort by revenue descending, take top N
  return Array.from(grouped.entries())
    .map(([productId, data]) => ({
      productId,
      name: data.name,
      quantity: data.quantity,
      revenue: Math.round(data.revenue * 100) / 100,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
