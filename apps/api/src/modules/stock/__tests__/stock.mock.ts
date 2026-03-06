import { vi } from 'vitest';
import type { Prisma } from '@prisma/client';

// ── Mock Prisma ─────────────────────────────────────────────────────

function createMockModel() {
  return {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  };
}

export function createMockPrisma() {
  return {
    stockItem: createMockModel(),
    stockMovement: createMockModel(),
    productIngredient: createMockModel(),
    product: createMockModel(),
    order: createMockModel(),
    alert: createMockModel(),
    dailyReport: createMockModel(),
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  };
}

export type MockPrisma = ReturnType<typeof createMockPrisma>;

// ── Sample Data ─────────────────────────────────────────────────────

export function createSampleStockItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'si_001',
    unitId: 'unit_001',
    name: 'Chopp Pilsen',
    sku: 'CHOPP-001',
    quantity: new MockDecimal(50) as unknown as Prisma.Decimal,
    unitType: 'L',
    minQuantity: new MockDecimal(10) as unknown as Prisma.Decimal,
    costPrice: new MockDecimal(4.5) as unknown as Prisma.Decimal,
    supplierId: null,
    isActive: true,
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
    ...overrides,
  };
}

export function createSampleStockItems() {
  return [
    createSampleStockItem(),
    createSampleStockItem({
      id: 'si_002',
      name: 'Limao Taiti',
      sku: 'LIMAO-001',
      quantity: new MockDecimal(100),
      unitType: 'UN',
      minQuantity: new MockDecimal(20),
      costPrice: new MockDecimal(0.5),
    }),
    createSampleStockItem({
      id: 'si_003',
      name: 'Cachaca',
      sku: 'CACHACA-001',
      quantity: new MockDecimal(5),
      unitType: 'L',
      minQuantity: new MockDecimal(3),
      costPrice: new MockDecimal(12),
    }),
  ];
}

export function createSampleMovement(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mov_001',
    stockItemId: 'si_001',
    type: 'IN',
    quantity: new MockDecimal(20) as unknown as Prisma.Decimal,
    reason: 'Reposicao',
    reference: null,
    employeeId: 'emp_001',
    costPrice: new MockDecimal(4.5) as unknown as Prisma.Decimal,
    createdAt: new Date('2026-03-01'),
    ...overrides,
  };
}

export function createSampleRecipe() {
  return [
    {
      id: 'pi_001',
      productId: 'prod_001',
      stockItemId: 'si_002', // Limao
      quantity: new MockDecimal(2) as unknown as Prisma.Decimal,
      stockItem: createSampleStockItem({
        id: 'si_002',
        name: 'Limao Taiti',
        quantity: new MockDecimal(100),
      }),
    },
    {
      id: 'pi_002',
      productId: 'prod_001',
      stockItemId: 'si_003', // Cachaca
      quantity: new MockDecimal(0.06) as unknown as Prisma.Decimal,
      stockItem: createSampleStockItem({
        id: 'si_003',
        name: 'Cachaca',
        quantity: new MockDecimal(5),
      }),
    },
  ];
}

// ── Mock Decimal ────────────────────────────────────────────────────

class MockDecimal {
  private value: number;
  constructor(value: number) {
    this.value = value;
  }
  toNumber() {
    return this.value;
  }
  toString() {
    return String(this.value);
  }
  valueOf() {
    return this.value;
  }
  // Make Number() work correctly
  [Symbol.toPrimitive](_hint: string) {
    return this.value;
  }
}
