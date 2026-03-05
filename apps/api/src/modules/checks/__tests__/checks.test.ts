import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateCheckTotals } from '../checks.service';
import * as service from '../checks.service';

const UNIT_ID = 'unit_test_001';
const CHECK_ID = 'check_test_001';
const EMPLOYEE_ID = 'emp_test_001';

function mockCheckData(overrides = {}) {
  return {
    id: CHECK_ID,
    unitId: UNIT_ID,
    status: 'OPEN',
    tableId: 'table_1',
    employeeId: EMPLOYEE_ID,
    splitParentId: null,
    serviceFeeAmount: null,
    tipAmount: null,
    discountAmount: null,
    discountReason: null,
    openedAt: new Date('2026-03-02T20:15:00Z'),
    orders: [
      {
        id: 'order_1',
        orderNumber: 42,
        status: 'DELIVERED',
        source: 'WAITER',
        createdAt: new Date('2026-03-02T20:16:00Z'),
        items: [
          {
            id: 'item_1',
            productId: 'prod_1',
            quantity: 3,
            unitPrice: 12.90,
            totalPrice: 38.70,
            modifiers: null,
            notes: null,
            isDelivered: true,
            product: { name: 'Chopp Pilsen 300ml' },
          },
          {
            id: 'item_2',
            productId: 'prod_2',
            quantity: 1,
            unitPrice: 18.00,
            totalPrice: 18.00,
            modifiers: null,
            notes: null,
            isDelivered: true,
            product: { name: 'Caipirinha' },
          },
        ],
      },
    ],
    payments: [],
    unit: { serviceFeeRate: '0.1000' },
    table: { id: 'table_1', number: 5, zone: { name: 'Salão Principal' } },
    splitChildren: [],
    ...overrides,
  };
}

describe('calculateCheckTotals', () => {
  it('should calculate totals correctly', () => {
    const check = mockCheckData();
    const totals = calculateCheckTotals(check);

    expect(totals.itemsTotal).toBeCloseTo(56.70, 2);
    expect(totals.serviceFee).toBeCloseTo(5.67, 2);
    expect(totals.grossTotal).toBeCloseTo(62.37, 2);
    expect(totals.totalPaid).toBe(0);
    expect(totals.remainingBalance).toBeCloseTo(62.37, 2);
  });

  it('should calculate with explicit service fee', () => {
    const check = mockCheckData({ serviceFeeAmount: 10.00 });
    const totals = calculateCheckTotals(check);

    expect(totals.serviceFee).toBe(10.00);
    expect(totals.grossTotal).toBeCloseTo(66.70, 2);
  });

  it('should subtract discount', () => {
    const check = mockCheckData({ discountAmount: 5.00 });
    const totals = calculateCheckTotals(check);

    expect(totals.discount).toBe(5.00);
    expect(totals.grossTotal).toBeCloseTo(57.37, 2);
  });

  it('should subtract confirmed payments from remaining balance', () => {
    const check = mockCheckData({
      payments: [
        { amount: 30.00, status: 'CONFIRMED' },
        { amount: 10.00, status: 'PENDING' }, // should be excluded
      ],
    });
    const totals = calculateCheckTotals(check);

    expect(totals.totalPaid).toBe(30.00);
    expect(totals.remainingBalance).toBeCloseTo(32.37, 2);
  });
});

describe('Check Operations', () => {
  // ── Split Equal ─────────────────────────────────────────────────
  describe('splitEqual', () => {
    it('should reject non-OPEN check', async () => {
      const prisma = createMockPrismaForChecks({ status: 'PAID' });
      await expect(
        service.splitEqual(prisma, CHECK_ID, UNIT_ID, EMPLOYEE_ID, {
          numberOfPeople: 3,
          includeServiceFee: true,
        }),
      ).rejects.toThrow('Conta deve estar aberta para dividir');
    });

    it('should reject split child', async () => {
      const prisma = createMockPrismaForChecks({ splitParentId: 'parent_1' });
      await expect(
        service.splitEqual(prisma, CHECK_ID, UNIT_ID, EMPLOYEE_ID, {
          numberOfPeople: 2,
          includeServiceFee: true,
        }),
      ).rejects.toThrow('já é filha de outra');
    });
  });

  // ── Apply Discount ──────────────────────────────────────────────
  describe('applyDiscount', () => {
    it('should reject discount > 15% without authorization', async () => {
      const prisma = createMockPrismaForChecks();
      await expect(
        service.applyDiscount(prisma, CHECK_ID, UNIT_ID, EMPLOYEE_ID, {
          type: 'PERCENTAGE',
          value: 20,
          reason: 'Test',
        }),
      ).rejects.toThrow('acima de 15%');
    });
  });

  // ── Update Service Fee ──────────────────────────────────────────
  describe('updateServiceFee', () => {
    it('should reject non-OPEN check', async () => {
      const prisma = {
        check: {
          findUnique: vi.fn().mockResolvedValue({
            id: CHECK_ID,
            unitId: UNIT_ID,
            status: 'PAID',
          }),
          update: vi.fn(),
        },
      } as unknown as Parameters<typeof service.updateServiceFee>[0];

      await expect(
        service.updateServiceFee(prisma, CHECK_ID, UNIT_ID, {
          serviceFeeAmount: 10,
        }),
      ).rejects.toThrow('Conta deve estar aberta');
    });

    it('should update service fee to zero', async () => {
      const prisma = {
        check: {
          findUnique: vi.fn().mockResolvedValue({
            id: CHECK_ID,
            unitId: UNIT_ID,
            status: 'OPEN',
          }),
          update: vi.fn(),
        },
      } as unknown as Parameters<typeof service.updateServiceFee>[0];

      const result = await service.updateServiceFee(prisma, CHECK_ID, UNIT_ID, {
        serviceFeeAmount: 0,
      });

      expect(result.message).toContain('removida');
    });
  });
});

function createMockPrismaForChecks(checkOverrides = {}) {
  const checkData = mockCheckData(checkOverrides);
  return {
    check: {
      findUnique: vi.fn().mockResolvedValue(checkData),
      update: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        check: {
          findUnique: vi.fn().mockResolvedValue(checkData),
          update: vi.fn(),
          create: vi.fn().mockImplementation((args: { data: { totalAmount: number } }) =>
            Promise.resolve({ id: `split_${Math.random()}`, ...args.data }),
          ),
        },
      }),
    ),
  } as unknown as Parameters<typeof service.splitEqual>[0];
}
