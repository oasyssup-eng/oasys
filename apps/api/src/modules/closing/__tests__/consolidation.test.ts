import { describe, it, expect } from 'vitest';
import {
  calculateRevenue,
  calculatePaymentSummary,
  calculateHourlyRevenue,
  calculateOperations,
  calculateFiscalSummary,
} from '../consolidation';
import {
  createSampleChecks,
  createSamplePayments,
  createSampleFiscalNotes,
} from './closing.mock';

// ── calculateRevenue ─────────────────────────────────────────────────

describe('calculateRevenue', () => {
  it('calculates correct gross/net/serviceFees/tips/discounts', () => {
    const checks = createSampleChecks();
    const result = calculateRevenue(checks);

    // Check 1: 50+50=100 gross, 10 service, 5 tip, 0 discount
    // Check 2: 45 gross (1 order delivered), 6 service, 0 tip, 5 discount, 35 cancellation
    // Check 3: cortesia → 20 courtesyAmount
    // Check 4: staff meal → 25 staffMealAmount
    // grossRevenue = 100 + 45 = 145
    expect(result.grossRevenue).toBe(145);
    expect(result.serviceFees).toBe(16);
    expect(result.tips).toBe(5);
    expect(result.discounts).toBe(5);
    expect(result.courtesyAmount).toBe(20);
    expect(result.staffMealAmount).toBe(25);
  });

  it('excludes cancellations from gross revenue', () => {
    const checks = createSampleChecks();
    const result = calculateRevenue(checks);

    // Cancellation amount from check 2's cancelled order
    expect(result.cancellationAmount).toBe(35);
    // Net = gross(145) - discounts(5) - cancellations(35) = 105
    expect(result.netRevenue).toBe(105);
  });

  it('counts cortesia and staffMeal separately', () => {
    const checks = createSampleChecks();
    const result = calculateRevenue(checks);

    expect(result.courtesyAmount).toBe(20);
    expect(result.staffMealAmount).toBe(25);
    // These do NOT count in grossRevenue
    expect(result.grossRevenue).toBe(145); // Only normal items
  });
});

// ── calculatePaymentSummary ──────────────────────────────────────────

describe('calculatePaymentSummary', () => {
  it('groups payments by method', () => {
    const payments = createSamplePayments();
    const result = calculatePaymentSummary(payments);

    // CONFIRMED: PIX=80, CASH=30, CREDIT_CARD=50
    expect(result.byMethod.PIX).toBe(80);
    expect(result.byMethod.CASH).toBe(30);
    expect(result.byMethod.CREDIT_CARD).toBe(50);
  });

  it('separates pending and refunded', () => {
    const payments = createSamplePayments();
    const result = calculatePaymentSummary(payments);

    expect(result.totalConfirmed).toBe(160); // 80+30+50
    expect(result.totalRefunded).toBe(10);
    expect(result.pendingCount).toBe(1);
    expect(result.pendingAmount).toBe(15);
  });
});

// ── calculateHourlyRevenue ───────────────────────────────────────────

describe('calculateHourlyRevenue', () => {
  it('groups checks by closing hour', () => {
    const checks = createSampleChecks();
    const result = calculateHourlyRevenue(checks);

    // Check 1 closed at 20:00 → hour 20, revenue from normal orders only (100)
    // Check 2 closed at 21:30 → hour 21, revenue 45 (non-cancelled orders only)
    // Check 3 closed at 19:00 → cortesia, skipped
    // Check 4 closed at 15:00 → staff meal, skipped
    const hour20 = result.find((h) => h.hour === 20);
    expect(hour20).toBeDefined();
    expect(hour20!.revenue).toBe(100);
    expect(hour20!.checkCount).toBe(1);

    const hour21 = result.find((h) => h.hour === 21);
    expect(hour21).toBeDefined();
    expect(hour21!.revenue).toBe(45);
  });
});

// ── calculateOperations ──────────────────────────────────────────────

describe('calculateOperations', () => {
  it('computes avgTicket and peakHour', () => {
    const checks = createSampleChecks();
    const result = calculateOperations(checks);

    // All 4 checks are PAID
    expect(result.paidChecks).toBe(4);
    expect(result.totalChecks).toBe(4);
    expect(result.openChecks).toBe(0);

    // avgTicket = (100+60+0+0)/4 = 40
    expect(result.avgTicket).toBe(40);

    // Peak hour: hour 20 has revenue 100 (highest)
    expect(result.peakHour).toBe(20);
    expect(result.peakHourRevenue).toBe(100);
  });
});

// ── calculateFiscalSummary ───────────────────────────────────────────

describe('calculateFiscalSummary', () => {
  it('detects missing fiscal notes', () => {
    const notes = createSampleFiscalNotes();
    const paidCheckIds = [
      'cltest_check_001',
      'cltest_check_002',
      'cltest_check_003',
      'cltest_check_004',
    ];

    const result = calculateFiscalSummary(notes, paidCheckIds);

    expect(result.authorized).toBe(2);
    expect(result.errors).toBe(1);
    // check_003 has ERROR note (doesn't count as covered), check_004 has no note
    expect(result.missingNotes).toBe(2);
    expect(result.fiscalAmount).toBe(160);
  });
});
