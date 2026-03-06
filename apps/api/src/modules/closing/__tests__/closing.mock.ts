import { vi } from 'vitest';
import type {
  ConsolidationCheck,
  ConsolidationPayment,
  ConsolidationCashRegister,
  ConsolidationFiscalNote,
} from '../consolidation';

/**
 * Creates a mock Prisma client with all models needed for closing tests.
 */
export function createMockPrisma() {
  return {
    check: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    cashRegister: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    fiscalNote: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    dailyReport: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    hourlyRevenue: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    unit: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    alert: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    orderItem: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        dailyReport: {
          create: vi.fn().mockResolvedValue({ id: 'cltest_report_001' }),
        },
        hourlyRevenue: {
          createMany: vi.fn(),
        },
      }),
    ),
  };
}

/**
 * Creates sample checks for consolidation testing.
 */
export function createSampleChecks(): ConsolidationCheck[] {
  return [
    {
      id: 'cltest_check_001',
      status: 'PAID',
      totalAmount: 100,
      serviceFeeAmount: 10,
      tipAmount: 5,
      discountAmount: 0,
      splitParentId: null,
      mergedIntoId: null,
      closedAt: new Date('2026-03-05T20:00:00Z'),
      orders: [
        {
          status: 'DELIVERED',
          isCortesia: false,
          staffMealEmployeeId: null,
          items: [
            {
              quantity: 2,
              unitPrice: 25,
              totalPrice: 50,
              product: { id: 'prod_001', name: 'Cerveja' },
            },
            {
              quantity: 1,
              unitPrice: 50,
              totalPrice: 50,
              product: { id: 'prod_002', name: 'Picanha' },
            },
          ],
        },
      ],
    },
    {
      id: 'cltest_check_002',
      status: 'PAID',
      totalAmount: 60,
      serviceFeeAmount: 6,
      tipAmount: 0,
      discountAmount: 5,
      splitParentId: null,
      mergedIntoId: null,
      closedAt: new Date('2026-03-05T21:30:00Z'),
      orders: [
        {
          status: 'DELIVERED',
          isCortesia: false,
          staffMealEmployeeId: null,
          items: [
            {
              quantity: 3,
              unitPrice: 15,
              totalPrice: 45,
              product: { id: 'prod_001', name: 'Cerveja' },
            },
          ],
        },
        {
          status: 'CANCELLED',
          isCortesia: false,
          staffMealEmployeeId: null,
          items: [
            {
              quantity: 1,
              unitPrice: 35,
              totalPrice: 35,
              product: { id: 'prod_003', name: 'Cancelled Item' },
            },
          ],
        },
      ],
    },
    // Cortesia check
    {
      id: 'cltest_check_003',
      status: 'PAID',
      totalAmount: 0,
      serviceFeeAmount: 0,
      tipAmount: 0,
      discountAmount: 0,
      splitParentId: null,
      mergedIntoId: null,
      closedAt: new Date('2026-03-05T19:00:00Z'),
      orders: [
        {
          status: 'DELIVERED',
          isCortesia: true,
          staffMealEmployeeId: null,
          items: [
            {
              quantity: 1,
              unitPrice: 20,
              totalPrice: 20,
              product: { id: 'prod_004', name: 'Cortesia Beer' },
            },
          ],
        },
      ],
    },
    // Staff meal
    {
      id: 'cltest_check_004',
      status: 'PAID',
      totalAmount: 0,
      serviceFeeAmount: 0,
      tipAmount: 0,
      discountAmount: 0,
      splitParentId: null,
      mergedIntoId: null,
      closedAt: new Date('2026-03-05T15:00:00Z'),
      orders: [
        {
          status: 'DELIVERED',
          isCortesia: false,
          staffMealEmployeeId: 'emp_001',
          items: [
            {
              quantity: 1,
              unitPrice: 25,
              totalPrice: 25,
              product: { id: 'prod_005', name: 'Staff Meal' },
            },
          ],
        },
      ],
    },
  ];
}

/**
 * Creates sample payments for testing.
 */
export function createSamplePayments(): ConsolidationPayment[] {
  return [
    { method: 'PIX', amount: 80, status: 'CONFIRMED' },
    { method: 'CASH', amount: 30, status: 'CONFIRMED' },
    { method: 'CREDIT_CARD', amount: 50, status: 'CONFIRMED' },
    { method: 'PIX', amount: 15, status: 'PENDING' },
    { method: 'CASH', amount: 10, status: 'REFUNDED' },
  ];
}

/**
 * Creates sample cash registers for testing.
 */
export function createSampleCashRegisters(): ConsolidationCashRegister[] {
  return [
    {
      id: 'cltest_cr_001',
      type: 'OPERATOR',
      status: 'CLOSED',
      employeeId: 'emp_cashier_001',
      openingBalance: 200,
      closingBalance: 225,
      expectedBalance: 230,
      difference: -5,
      operations: [{ type: 'SUPPLY', amount: 100 }],
      payments: [
        { amount: 30, method: 'CASH' },
      ],
    },
  ];
}

/**
 * Creates sample fiscal notes for testing.
 */
export function createSampleFiscalNotes(): ConsolidationFiscalNote[] {
  return [
    { id: 'fn_001', checkId: 'cltest_check_001', status: 'AUTHORIZED', totalAmount: 100 },
    { id: 'fn_002', checkId: 'cltest_check_002', status: 'AUTHORIZED', totalAmount: 60 },
    { id: 'fn_003', checkId: 'cltest_check_003', status: 'ERROR', totalAmount: 20 },
  ];
}
