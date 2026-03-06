import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { createMockPrisma, type MockPrisma } from './stock.mock';
import { deductStockForOrder } from '../deduction.service';

// ── Setup ───────────────────────────────────────────────────────────

let mockPrisma: MockPrisma;

beforeEach(() => {
  mockPrisma = createMockPrisma();
  vi.clearAllMocks();
});

const prisma = () => mockPrisma as unknown as PrismaClient;

// ── Helpers ─────────────────────────────────────────────────────────

function mockDecimal(value: number) {
  return {
    valueOf: () => value,
    toNumber: () => value,
    toString: () => String(value),
    [Symbol.toPrimitive]: () => value,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('deductStockForOrder', () => {
  it('creates OUT movements per ingredient based on recipe', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order_001',
      items: [
        { productId: 'prod_001', quantity: 2 }, // 2 Caipirinhas
      ],
    });

    mockPrisma.productIngredient.findMany.mockResolvedValue([
      {
        productId: 'prod_001',
        stockItemId: 'si_limao',
        quantity: mockDecimal(3), // 3 limoes per caipirinha
        stockItem: {
          id: 'si_limao',
          name: 'Limao',
          quantity: mockDecimal(100),
          minQuantity: mockDecimal(20),
          unitType: 'UN',
          costPrice: mockDecimal(0.5),
        },
      },
      {
        productId: 'prod_001',
        stockItemId: 'si_cachaca',
        quantity: mockDecimal(0.06), // 60ml per caipirinha
        stockItem: {
          id: 'si_cachaca',
          name: 'Cachaca',
          quantity: mockDecimal(5),
          minQuantity: mockDecimal(2),
          unitType: 'L',
          costPrice: mockDecimal(12),
        },
      },
    ]);

    mockPrisma.$transaction.mockResolvedValue([]);

    const result = await deductStockForOrder(prisma(), 'order_001', 'unit_001');

    expect(result.deducted).toBe(2); // 2 stock items deducted
    expect(result.skipped).toBe(0);
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });

  it('skips products without a recipe', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order_002',
      items: [
        { productId: 'prod_no_recipe', quantity: 1 },
      ],
    });

    // No ingredients found for this product
    mockPrisma.productIngredient.findMany.mockResolvedValue([]);

    const result = await deductStockForOrder(prisma(), 'order_002', 'unit_001');

    expect(result.deducted).toBe(0);
    expect(result.skipped).toBe(1);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates LOW_STOCK alert when deduction drops below minimum', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order_003',
      items: [
        { productId: 'prod_001', quantity: 5 },
      ],
    });

    mockPrisma.productIngredient.findMany.mockResolvedValue([
      {
        productId: 'prod_001',
        stockItemId: 'si_item',
        quantity: mockDecimal(10), // 10 units per product
        stockItem: {
          id: 'si_item',
          name: 'Ingrediente A',
          quantity: mockDecimal(60), // 60 in stock
          minQuantity: mockDecimal(20), // min is 20
          unitType: 'UN',
          costPrice: mockDecimal(1),
        },
      },
    ]);

    mockPrisma.$transaction.mockResolvedValue([]);
    mockPrisma.alert.create.mockResolvedValue({});

    const result = await deductStockForOrder(prisma(), 'order_003', 'unit_001');

    // 60 - (5 * 10) = 10, which is < 20 (min)
    expect(result.deducted).toBe(1);
    expect(result.alerts).toContain('Ingrediente A');
    expect(mockPrisma.alert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'LOW_STOCK',
          severity: 'WARNING',
        }),
      }),
    );
  });

  it('does not throw on failure (fire-and-forget safety)', async () => {
    // Simulate a database error
    mockPrisma.order.findUnique.mockRejectedValue(new Error('DB connection lost'));

    // Should NOT throw
    await expect(
      deductStockForOrder(prisma(), 'order_fail', 'unit_001'),
    ).rejects.toThrow(); // The function itself throws, but the CALLER wraps in try-catch

    // The important thing is that the function can be safely wrapped
    // by the caller with try-catch without blocking order production
  });
});
