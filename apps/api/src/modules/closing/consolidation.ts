/**
 * Pure calculation functions for day closing consolidation.
 * No Prisma dependency — all functions take pre-fetched data.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface ConsolidationCheck {
  id: string;
  status: string;
  totalAmount: number | null;
  serviceFeeAmount: number | null;
  tipAmount: number | null;
  discountAmount: number | null;
  splitParentId: string | null;
  mergedIntoId: string | null;
  closedAt: Date | null;
  orders: ConsolidationOrder[];
}

export interface ConsolidationOrder {
  status: string;
  isCortesia: boolean;
  staffMealEmployeeId: string | null;
  items: ConsolidationOrderItem[];
}

export interface ConsolidationOrderItem {
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: { id: string; name: string };
}

export interface ConsolidationPayment {
  method: string;
  amount: number;
  status: string;
}

export interface ConsolidationCashRegister {
  id: string;
  type: string;
  status: string;
  employeeId: string | null;
  openingBalance: number;
  closingBalance: number | null;
  expectedBalance: number | null;
  difference: number | null;
  operations: { type: string; amount: number }[];
  payments: { amount: number; method: string }[];
}

export interface ConsolidationFiscalNote {
  id: string;
  checkId: string;
  status: string;
  totalAmount: number | null;
}

// ── Revenue Calculation ──────────────────────────────────────────────

export interface RevenueResult {
  grossRevenue: number;
  serviceFees: number;
  tips: number;
  discounts: number;
  cancellationAmount: number;
  courtesyAmount: number;
  staffMealAmount: number;
  netRevenue: number;
}

export function calculateRevenue(checks: ConsolidationCheck[]): RevenueResult {
  let grossRevenue = 0;
  let serviceFees = 0;
  let tips = 0;
  let discounts = 0;
  let cancellationAmount = 0;
  let courtesyAmount = 0;
  let staffMealAmount = 0;

  for (const check of checks) {
    // Skip split children (counted via parent) and merged checks (counted via target)
    if (check.splitParentId || check.mergedIntoId) continue;

    if (check.status === 'CANCELLED') {
      // Cancelled checks: sum all order items for cancellation amount
      for (const order of check.orders) {
        for (const item of order.items) {
          cancellationAmount += item.totalPrice;
        }
      }
      continue;
    }

    // Active checks (PAID, CLOSED, OPEN)
    for (const order of check.orders) {
      if (order.status === 'CANCELLED') {
        for (const item of order.items) {
          cancellationAmount += item.totalPrice;
        }
        continue;
      }

      if (order.isCortesia) {
        for (const item of order.items) {
          courtesyAmount += item.totalPrice;
        }
        continue;
      }

      if (order.staffMealEmployeeId) {
        for (const item of order.items) {
          staffMealAmount += item.totalPrice;
        }
        continue;
      }

      // Normal items
      for (const item of order.items) {
        grossRevenue += item.totalPrice;
      }
    }

    serviceFees += check.serviceFeeAmount ?? 0;
    tips += check.tipAmount ?? 0;
    discounts += check.discountAmount ?? 0;
  }

  // Net revenue: gross items - discounts - cancellations (courtesies produced but not charged)
  const netRevenue = Math.max(0, grossRevenue - discounts - cancellationAmount);

  return {
    grossRevenue: round2(grossRevenue),
    serviceFees: round2(serviceFees),
    tips: round2(tips),
    discounts: round2(discounts),
    cancellationAmount: round2(cancellationAmount),
    courtesyAmount: round2(courtesyAmount),
    staffMealAmount: round2(staffMealAmount),
    netRevenue: round2(netRevenue),
  };
}

// ── Payment Summary ──────────────────────────────────────────────────

export interface PaymentSummary {
  totalConfirmed: number;
  totalRefunded: number;
  pendingCount: number;
  pendingAmount: number;
  byMethod: Record<string, number>;
}

export function calculatePaymentSummary(
  payments: ConsolidationPayment[],
): PaymentSummary {
  let totalConfirmed = 0;
  let totalRefunded = 0;
  let pendingCount = 0;
  let pendingAmount = 0;
  const byMethod: Record<string, number> = {};

  for (const payment of payments) {
    if (payment.status === 'CONFIRMED') {
      totalConfirmed += payment.amount;
      byMethod[payment.method] = (byMethod[payment.method] ?? 0) + payment.amount;
    } else if (payment.status === 'REFUNDED') {
      totalRefunded += payment.amount;
    } else if (payment.status === 'PENDING') {
      pendingCount++;
      pendingAmount += payment.amount;
    }
  }

  // Round all method amounts
  for (const key of Object.keys(byMethod)) {
    byMethod[key] = round2(byMethod[key]!);
  }

  return {
    totalConfirmed: round2(totalConfirmed),
    totalRefunded: round2(totalRefunded),
    pendingCount,
    pendingAmount: round2(pendingAmount),
    byMethod,
  };
}

// ── Cash Summary ─────────────────────────────────────────────────────

export interface CashRegisterSummary {
  registerId: string;
  type: string;
  employeeId: string | null;
  openingBalance: number;
  closingBalance: number | null;
  expectedBalance: number | null;
  difference: number | null;
  transactionCount: number;
}

export function calculateCashSummary(
  cashRegisters: ConsolidationCashRegister[],
): CashRegisterSummary[] {
  return cashRegisters.map((reg) => ({
    registerId: reg.id,
    type: reg.type,
    employeeId: reg.employeeId,
    openingBalance: reg.openingBalance,
    closingBalance: reg.closingBalance,
    expectedBalance: reg.expectedBalance,
    difference: reg.difference,
    transactionCount: reg.payments.length + reg.operations.length,
  }));
}

// ── Fiscal Summary ───────────────────────────────────────────────────

export interface FiscalSummary {
  totalNotes: number;
  authorized: number;
  rejected: number;
  errors: number;
  cancelled: number;
  missingNotes: number;
  fiscalAmount: number;
  divergenceAmount: number;
}

export function calculateFiscalSummary(
  fiscalNotes: ConsolidationFiscalNote[],
  paidCheckIds: string[],
): FiscalSummary {
  let authorized = 0;
  let rejected = 0;
  let errors = 0;
  let cancelled = 0;
  let fiscalAmount = 0;

  const checkIdsWithNotes = new Set<string>();

  for (const note of fiscalNotes) {
    switch (note.status) {
      case 'AUTHORIZED':
        authorized++;
        fiscalAmount += note.totalAmount ?? 0;
        checkIdsWithNotes.add(note.checkId);
        break;
      case 'REJECTED':
        rejected++;
        break;
      case 'ERROR':
        errors++;
        break;
      case 'CANCELLED':
        cancelled++;
        break;
      default:
        // PENDING, PROCESSING — also count as having a note
        checkIdsWithNotes.add(note.checkId);
        break;
    }
  }

  const missingNotes = paidCheckIds.filter(
    (id) => !checkIdsWithNotes.has(id),
  ).length;

  return {
    totalNotes: fiscalNotes.length,
    authorized,
    rejected,
    errors,
    cancelled,
    missingNotes,
    fiscalAmount: round2(fiscalAmount),
    divergenceAmount: 0, // Calculated by reconciliation
  };
}

// ── Hourly Revenue ───────────────────────────────────────────────────

export interface HourlyRevenueEntry {
  hour: number;
  revenue: number;
  orderCount: number;
  checkCount: number;
}

export function calculateHourlyRevenue(
  checks: ConsolidationCheck[],
): HourlyRevenueEntry[] {
  const hourly = new Map<number, { revenue: number; orderCount: number; checkIds: Set<string> }>();

  for (const check of checks) {
    if (check.status === 'CANCELLED' || check.splitParentId || check.mergedIntoId) continue;
    if (!check.closedAt) continue;

    const hour = check.closedAt.getUTCHours();
    const existing = hourly.get(hour) ?? { revenue: 0, orderCount: 0, checkIds: new Set<string>() };

    existing.checkIds.add(check.id);

    for (const order of check.orders) {
      if (order.status === 'CANCELLED' || order.isCortesia) continue;
      existing.orderCount++;
      for (const item of order.items) {
        existing.revenue += item.totalPrice;
      }
    }

    hourly.set(hour, existing);
  }

  const result: HourlyRevenueEntry[] = [];
  for (const [hour, data] of hourly) {
    result.push({
      hour,
      revenue: round2(data.revenue),
      orderCount: data.orderCount,
      checkCount: data.checkIds.size,
    });
  }

  return result.sort((a, b) => a.hour - b.hour);
}

// ── Operations Summary ───────────────────────────────────────────────

export interface OperationsSummary {
  totalChecks: number;
  paidChecks: number;
  openChecks: number;
  splitChecks: number;
  mergedChecks: number;
  totalOrders: number;
  cancelledOrders: number;
  avgTicket: number;
  peakHour: number | null;
  peakHourRevenue: number;
}

export function calculateOperations(checks: ConsolidationCheck[]): OperationsSummary {
  let paidChecks = 0;
  let openChecks = 0;
  let splitChecks = 0;
  let mergedChecks = 0;
  let totalOrders = 0;
  let cancelledOrders = 0;
  let totalPaidAmount = 0;

  for (const check of checks) {
    if (check.status === 'PAID') {
      paidChecks++;
      totalPaidAmount += check.totalAmount ?? 0;
    }
    if (check.status === 'OPEN') openChecks++;
    if (check.splitParentId) splitChecks++;
    if (check.mergedIntoId) mergedChecks++;

    for (const order of check.orders) {
      totalOrders++;
      if (order.status === 'CANCELLED') cancelledOrders++;
    }
  }

  const avgTicket = paidChecks > 0 ? round2(totalPaidAmount / paidChecks) : 0;

  // Calculate peak hour from hourly revenue
  const hourlyData = calculateHourlyRevenue(checks);
  let peakHour: number | null = null;
  let peakHourRevenue = 0;

  for (const entry of hourlyData) {
    if (entry.revenue > peakHourRevenue) {
      peakHour = entry.hour;
      peakHourRevenue = entry.revenue;
    }
  }

  return {
    totalChecks: checks.length,
    paidChecks,
    openChecks,
    splitChecks,
    mergedChecks,
    totalOrders,
    cancelledOrders,
    avgTicket,
    peakHour,
    peakHourRevenue: round2(peakHourRevenue),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
