import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { createMockPrisma, type MockPrisma } from './stock.mock';
import { calculateCMV } from '../cmv.calculator';

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

// ── Tests ───────────────────────────────────────────────────────────

describe('calculateCMV', () => {
  it('calculates correct CMV percentage', async () => {
    mockPrisma.stockMovement.findMany.mockResolvedValue([
      {
        stockItemId: 'si_001',
        quantity: mockDecimal(10),
        costPrice: mockDecimal(5), // 10 * 5 = 50
        stockItem: { id: 'si_001', name: 'Item A', unitType: 'UN' },
      },
      {
        stockItemId: 'si_002',
        quantity: mockDecimal(20),
        costPrice: mockDecimal(2), // 20 * 2 = 40
        stockItem: { id: 'si_002', name: 'Item B', unitType: 'KG' },
      },
    ]);

    mockPrisma.dailyReport.findMany.mockResolvedValue([
      { netRevenue: mockDecimal(300) }, // Total cost = 90, net = 300 => 30%
    ]);

    const result = await calculateCMV(prisma(), 'unit_001', '2026-03-01', '2026-03-05');

    expect(result.totalCost).toBe(90); // 50 + 40
    expect(result.netRevenue).toBe(300);
    expect(result.cmvPercentage).toBe(30); // 90/300 * 100
  });

  it('returns 0 when no revenue exists', async () => {
    mockPrisma.stockMovement.findMany.mockResolvedValue([
      {
        stockItemId: 'si_001',
        quantity: mockDecimal(10),
        costPrice: mockDecimal(5),
        stockItem: { id: 'si_001', name: 'Item A', unitType: 'UN' },
      },
    ]);

    mockPrisma.dailyReport.findMany.mockResolvedValue([]); // No reports

    const result = await calculateCMV(prisma(), 'unit_001', '2026-03-01', '2026-03-05');

    expect(result.totalCost).toBe(50);
    expect(result.netRevenue).toBe(0);
    expect(result.cmvPercentage).toBe(0); // Avoid division by zero
  });

  it('returns topCostItems sorted by total cost descending', async () => {
    mockPrisma.stockMovement.findMany.mockResolvedValue([
      {
        stockItemId: 'si_001',
        quantity: mockDecimal(5),
        costPrice: mockDecimal(10), // 5 * 10 = 50
        stockItem: { id: 'si_001', name: 'Expensive', unitType: 'L' },
      },
      {
        stockItemId: 'si_002',
        quantity: mockDecimal(100),
        costPrice: mockDecimal(1), // 100 * 1 = 100
        stockItem: { id: 'si_002', name: 'Bulk', unitType: 'UN' },
      },
      {
        stockItemId: 'si_003',
        quantity: mockDecimal(2),
        costPrice: mockDecimal(3), // 2 * 3 = 6
        stockItem: { id: 'si_003', name: 'Cheap', unitType: 'KG' },
      },
    ]);

    mockPrisma.dailyReport.findMany.mockResolvedValue([
      { netRevenue: mockDecimal(500) },
    ]);

    const result = await calculateCMV(prisma(), 'unit_001', '2026-03-01', '2026-03-05');

    expect(result.topCostItems[0]!.stockItemName).toBe('Bulk'); // 100
    expect(result.topCostItems[1]!.stockItemName).toBe('Expensive'); // 50
    expect(result.topCostItems[2]!.stockItemName).toBe('Cheap'); // 6
  });
});
