import { describe, it, expect } from 'vitest';
import { reconcile } from '../reconciliation';
import type {
  RevenueResult,
  PaymentSummary,
  CashRegisterSummary,
  FiscalSummary,
} from '../consolidation';

// ── Helpers ──────────────────────────────────────────────────────────

function makeRevenue(overrides: Partial<RevenueResult> = {}): RevenueResult {
  return {
    grossRevenue: 1000,
    serviceFees: 100,
    tips: 50,
    discounts: 0,
    cancellationAmount: 0,
    courtesyAmount: 0,
    staffMealAmount: 0,
    netRevenue: 1000,
    ...overrides,
  };
}

function makePayments(overrides: Partial<PaymentSummary> = {}): PaymentSummary {
  return {
    totalConfirmed: 1150, // net(1000) + service(100) + tips(50)
    totalRefunded: 0,
    pendingCount: 0,
    pendingAmount: 0,
    byMethod: { PIX: 500, CASH: 350, CREDIT_CARD: 300 },
    ...overrides,
  };
}

function makeCash(overrides: Partial<CashRegisterSummary>[] = []): CashRegisterSummary[] {
  if (overrides.length === 0) {
    return [
      {
        registerId: 'cr_001',
        type: 'OPERATOR',
        employeeId: 'emp_001',
        openingBalance: 200,
        closingBalance: 550,
        expectedBalance: 550,
        difference: 0,
        transactionCount: 5,
      },
    ];
  }
  return overrides.map((o) => ({
    registerId: 'cr_001',
    type: 'OPERATOR',
    employeeId: 'emp_001',
    openingBalance: 200,
    closingBalance: 550,
    expectedBalance: 550,
    difference: 0,
    transactionCount: 5,
    ...o,
  }));
}

function makeFiscal(overrides: Partial<FiscalSummary> = {}): FiscalSummary {
  return {
    totalNotes: 10,
    authorized: 10,
    rejected: 0,
    errors: 0,
    cancelled: 0,
    missingNotes: 0,
    fiscalAmount: 1000,
    divergenceAmount: 0,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('reconcile', () => {
  it('returns balanced when no divergences', () => {
    const result = reconcile(makeRevenue(), makePayments(), makeCash(), makeFiscal());

    expect(result.isBalanced).toBe(true);
    expect(result.divergences).toHaveLength(0);
    expect(result.totalDivergenceAmount).toBe(0);
  });

  it('detects cash register difference', () => {
    const result = reconcile(
      makeRevenue(),
      makePayments(),
      makeCash([{ difference: -75 }]),
      makeFiscal(),
    );

    expect(result.isBalanced).toBe(false);
    const cashDiv = result.divergences.find((d) => d.type === 'CASH_DIFFERENCE');
    expect(cashDiv).toBeDefined();
    expect(cashDiv!.severity).toBe('CRITICAL'); // >R$50
    expect(cashDiv!.amount).toBe(-75);
  });

  it('detects missing fiscal notes', () => {
    const result = reconcile(
      makeRevenue(),
      makePayments(),
      makeCash(),
      makeFiscal({ missingNotes: 3 }),
    );

    expect(result.isBalanced).toBe(false);
    const fiscalDiv = result.divergences.find((d) => d.type === 'FISCAL_MISSING');
    expect(fiscalDiv).toBeDefined();
    expect(fiscalDiv!.severity).toBe('CRITICAL');
  });

  it('detects revenue/payment mismatch > R$0.50', () => {
    // Revenue expects 1000+100+50=1150, but only 1100 confirmed
    const result = reconcile(
      makeRevenue(),
      makePayments({ totalConfirmed: 1100 }),
      makeCash(),
      makeFiscal(),
    );

    expect(result.isBalanced).toBe(false);
    const mismatchDiv = result.divergences.find(
      (d) => d.type === 'REVENUE_PAYMENT_MISMATCH',
    );
    expect(mismatchDiv).toBeDefined();
    expect(mismatchDiv!.amount).toBe(50); // 1150-1100
  });
});
