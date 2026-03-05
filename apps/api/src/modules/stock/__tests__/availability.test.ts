import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { createMockPrisma, type MockPrisma } from './stock.mock';
import { checkAndDisableProducts, checkAndRestoreProducts } from '../availability.service';

// ── Setup ───────────────────────────────────────────────────────────

let mockPrisma: MockPrisma;

beforeEach(() => {
  mockPrisma = createMockPrisma();
  vi.clearAllMocks();
});

const prisma = () => mockPrisma as unknown as PrismaClient;

function mockDecimal(value: number) {
  return {
    valueOf: () => value,
    toNumber: () => value,
    toString: () => String(value),
    [Symbol.toPrimitive]: () => value,
  };
}

// ── checkAndDisableProducts ─────────────────────────────────────────

describe('checkAndDisableProducts', () => {
  it('sets isAvailable=false when stock item quantity is 0', async () => {
    mockPrisma.stockItem.findUnique.mockResolvedValue({
      quantity: mockDecimal(0),
    });

    mockPrisma.productIngredient.findMany.mockResolvedValue([
      { productId: 'prod_001' },
      { productId: 'prod_002' },
    ]);

    mockPrisma.product.updateMany.mockResolvedValue({ count: 2 });

    await checkAndDisableProducts(prisma(), 'si_001');

    expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['prod_001', 'prod_002'] },
        isAvailable: true,
      },
      data: { isAvailable: false },
    });
  });
});

// ── checkAndRestoreProducts ─────────────────────────────────────────

describe('checkAndRestoreProducts', () => {
  it('restores isAvailable=true when ALL ingredients are above 0', async () => {
    mockPrisma.productIngredient.findMany
      // First call: ingredients linked to this stock item
      .mockResolvedValueOnce([{ productId: 'prod_001' }])
      // Second call: all ingredients of prod_001
      .mockResolvedValueOnce([
        {
          productId: 'prod_001',
          stockItem: { quantity: mockDecimal(10), isActive: true },
        },
        {
          productId: 'prod_001',
          stockItem: { quantity: mockDecimal(5), isActive: true },
        },
      ]);

    mockPrisma.product.update.mockResolvedValue({});

    await checkAndRestoreProducts(prisma(), 'si_001');

    expect(mockPrisma.product.update).toHaveBeenCalledWith({
      where: { id: 'prod_001' },
      data: { isAvailable: true },
    });
  });

  it('does NOT restore if any ingredient is still at 0', async () => {
    mockPrisma.productIngredient.findMany
      .mockResolvedValueOnce([{ productId: 'prod_001' }])
      .mockResolvedValueOnce([
        {
          productId: 'prod_001',
          stockItem: { quantity: mockDecimal(10), isActive: true },
        },
        {
          productId: 'prod_001',
          stockItem: { quantity: mockDecimal(0), isActive: true }, // Still zero
        },
      ]);

    await checkAndRestoreProducts(prisma(), 'si_001');

    expect(mockPrisma.product.update).not.toHaveBeenCalled();
  });
});
