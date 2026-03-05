/**
 * Previous week comparison for day closing.
 * Compares current day with the same weekday 7 days ago.
 */

import type { PrismaClient } from '@prisma/client';

// ── Types ────────────────────────────────────────────────────────────

export interface Comparison {
  previousDate: string;
  revenueChange: number | null; // percentage
  checksChange: number | null;  // percentage
  previousRevenue: number;
  previousChecks: number;
  currentRevenue: number;
  currentChecks: number;
}

// ── Comparison ───────────────────────────────────────────────────────

export async function calculateComparison(
  prisma: PrismaClient,
  unitId: string,
  currentDate: string,
  currentRevenue: number,
  currentChecks: number,
): Promise<Comparison | null> {
  // Same weekday previous week = 7 days ago
  const current = new Date(currentDate);
  const previous = new Date(current);
  previous.setDate(previous.getDate() - 7);
  const previousDateStr = previous.toISOString().split('T')[0]!;

  const previousReport = await prisma.dailyReport.findUnique({
    where: {
      unitId_date: {
        unitId,
        date: new Date(previousDateStr),
      },
    },
    select: {
      netRevenue: true,
      totalRevenue: true,
      paidChecks: true,
      totalChecks: true,
    },
  });

  if (!previousReport) {
    return null;
  }

  const prevRevenue = Number(previousReport.netRevenue ?? previousReport.totalRevenue ?? 0);
  const prevChecks = previousReport.paidChecks ?? previousReport.totalChecks ?? 0;

  const revenueChange =
    prevRevenue > 0
      ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 10000) / 100
      : null;

  const checksChange =
    prevChecks > 0
      ? Math.round(((currentChecks - prevChecks) / prevChecks) * 10000) / 100
      : null;

  return {
    previousDate: previousDateStr,
    revenueChange,
    checksChange,
    previousRevenue: prevRevenue,
    previousChecks: prevChecks,
    currentRevenue,
    currentChecks,
  };
}
