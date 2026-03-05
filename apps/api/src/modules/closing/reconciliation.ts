/**
 * Divergence detection for day closing reconciliation.
 * Compares revenue, payments, cash, and fiscal data to find mismatches.
 */

import type {
  RevenueResult,
  PaymentSummary,
  CashRegisterSummary,
  FiscalSummary,
} from './consolidation';

// ── Types ────────────────────────────────────────────────────────────

export type DivergenceType =
  | 'CASH_DIFFERENCE'
  | 'FISCAL_MISSING'
  | 'PENDING_PAYMENTS'
  | 'REVENUE_PAYMENT_MISMATCH';

export interface Divergence {
  type: DivergenceType;
  severity: 'WARNING' | 'CRITICAL';
  description: string;
  amount: number;
}

export interface Reconciliation {
  isBalanced: boolean;
  divergences: Divergence[];
  totalDivergenceAmount: number;
}

// ── Reconciliation ───────────────────────────────────────────────────

const MISMATCH_THRESHOLD = 0.5; // R$0.50

export function reconcile(
  revenue: RevenueResult,
  payments: PaymentSummary,
  cashSummaries: CashRegisterSummary[],
  fiscal: FiscalSummary,
): Reconciliation {
  const divergences: Divergence[] = [];

  // 1. Cash register differences
  for (const reg of cashSummaries) {
    if (reg.difference != null && Math.abs(reg.difference) > MISMATCH_THRESHOLD) {
      divergences.push({
        type: 'CASH_DIFFERENCE',
        severity: Math.abs(reg.difference) > 50 ? 'CRITICAL' : 'WARNING',
        description: `Caixa ${reg.registerId.slice(-8)} com diferença de R$ ${reg.difference.toFixed(2)}`,
        amount: reg.difference,
      });
    }
  }

  // 2. Fiscal notes missing
  if (fiscal.missingNotes > 0) {
    divergences.push({
      type: 'FISCAL_MISSING',
      severity: 'CRITICAL',
      description: `${fiscal.missingNotes} conta(s) paga(s) sem nota fiscal emitida`,
      amount: 0,
    });
  }

  // 3. Pending payments
  if (payments.pendingCount > 0) {
    divergences.push({
      type: 'PENDING_PAYMENTS',
      severity: 'WARNING',
      description: `${payments.pendingCount} pagamento(s) pendente(s) totalizando R$ ${payments.pendingAmount.toFixed(2)}`,
      amount: payments.pendingAmount,
    });
  }

  // 4. Revenue vs payments mismatch
  const expectedPayments = revenue.netRevenue + revenue.serviceFees + revenue.tips;
  const actualPayments = payments.totalConfirmed;
  const revenuePaymentDiff = Math.abs(expectedPayments - actualPayments);

  if (revenuePaymentDiff > MISMATCH_THRESHOLD) {
    divergences.push({
      type: 'REVENUE_PAYMENT_MISMATCH',
      severity: revenuePaymentDiff > 100 ? 'CRITICAL' : 'WARNING',
      description: `Diferença entre faturamento esperado (R$ ${expectedPayments.toFixed(2)}) e recebimentos (R$ ${actualPayments.toFixed(2)}): R$ ${revenuePaymentDiff.toFixed(2)}`,
      amount: round2(expectedPayments - actualPayments),
    });
  }

  const totalDivergenceAmount = divergences.reduce(
    (sum, d) => sum + Math.abs(d.amount),
    0,
  );

  return {
    isBalanced: divergences.length === 0,
    divergences,
    totalDivergenceAmount: round2(totalDivergenceAmount),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
