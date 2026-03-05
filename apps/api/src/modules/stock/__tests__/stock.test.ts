import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { createMockPrisma, createSampleStockItem, type MockPrisma } from './stock.mock';
import * as service from '../stock.service';

// ── Setup ───────────────────────────────────────────────────────────

let mockPrisma: MockPrisma;

beforeEach(() => {
  mockPrisma = createMockPrisma();
  vi.clearAllMocks();
});

const prisma = () => mockPrisma as unknown as PrismaClient;

// ── Stock Item CRUD ─────────────────────────────────────────────────

describe('createStockItem', () => {
  it('creates a stock item with valid data', async () => {
    const sample = createSampleStockItem();
    mockPrisma.stockItem.findUnique.mockResolvedValue(null); // No SKU conflict
    mockPrisma.stockItem.create.mockResolvedValue(sample);

    const result = await service.createStockItem(prisma(), 'unit_001', {
      name: 'Chopp Pilsen',
      sku: 'CHOPP-001',
      unitType: 'L',
      quantity: 50,
      minQuantity: 10,
      costPrice: 4.5,
    });

    expect(result.name).toBe('Chopp Pilsen');
    expect(result.quantity).toBe(50);
    expect(result.unitType).toBe('L');
    expect(mockPrisma.stockItem.create).toHaveBeenCalledOnce();
  });

  it('throws conflict on duplicate SKU in same unit', async () => {
    const existing = createSampleStockItem();
    mockPrisma.stockItem.findUnique.mockResolvedValue(existing);

    await expect(
      service.createStockItem(prisma(), 'unit_001', {
        name: 'Outro Chopp',
        sku: 'CHOPP-001', // duplicate
        unitType: 'L',
        quantity: 0,
      }),
    ).rejects.toThrow('já está em uso');
  });
});

// ── Movements ───────────────────────────────────────────────────────

describe('createMovement', () => {
  it('increases quantity on IN movement', async () => {
    const item = createSampleStockItem({ quantity: { valueOf: () => 50, toNumber: () => 50, toString: () => '50', [Symbol.toPrimitive]: () => 50 } });
    mockPrisma.stockItem.findUnique.mockResolvedValue(item);

    const movement = {
      id: 'mov_001',
      stockItemId: 'si_001',
      type: 'IN',
      quantity: { valueOf: () => 20, toNumber: () => 20, toString: () => '20', [Symbol.toPrimitive]: () => 20 },
      reason: 'Reposicao',
      reference: null,
      employeeId: 'emp_001',
      costPrice: { valueOf: () => 4.5, toNumber: () => 4.5, toString: () => '4.5', [Symbol.toPrimitive]: () => 4.5 },
      createdAt: new Date(),
    };
    mockPrisma.$transaction.mockResolvedValue([movement]);

    const result = await service.createMovement(prisma(), 'unit_001', {
      stockItemId: 'si_001',
      type: 'IN',
      quantity: 20,
      reason: 'Reposicao',
    }, 'emp_001');

    expect(result.newStockQuantity).toBe(70); // 50 + 20
    expect(result.type).toBe('IN');
  });

  it('decreases quantity on OUT movement (allows negative)', async () => {
    const item = createSampleStockItem({ quantity: { valueOf: () => 5, toNumber: () => 5, toString: () => '5', [Symbol.toPrimitive]: () => 5 } });
    item.minQuantity = { valueOf: () => 10, toNumber: () => 10, toString: () => '10', [Symbol.toPrimitive]: () => 10 } as never;
    mockPrisma.stockItem.findUnique.mockResolvedValue(item);
    mockPrisma.alert.create.mockResolvedValue({});

    const movement = {
      id: 'mov_002',
      stockItemId: 'si_001',
      type: 'OUT',
      quantity: { valueOf: () => 10, toNumber: () => 10, toString: () => '10', [Symbol.toPrimitive]: () => 10 },
      reason: 'Venda',
      reference: null,
      employeeId: 'emp_001',
      costPrice: null,
      createdAt: new Date(),
    };
    mockPrisma.$transaction.mockResolvedValue([movement]);

    const result = await service.createMovement(prisma(), 'unit_001', {
      stockItemId: 'si_001',
      type: 'OUT',
      quantity: 10,
      reason: 'Venda',
    }, 'emp_001');

    expect(result.newStockQuantity).toBe(-5); // 5 - 10 = -5 (negative allowed)
  });

  it('sets absolute quantity on ADJUSTMENT movement', async () => {
    const item = createSampleStockItem({ quantity: { valueOf: () => 50, toNumber: () => 50, toString: () => '50', [Symbol.toPrimitive]: () => 50 } });
    mockPrisma.stockItem.findUnique.mockResolvedValue(item);

    const movement = {
      id: 'mov_003',
      stockItemId: 'si_001',
      type: 'ADJUSTMENT',
      quantity: { valueOf: () => 25, toNumber: () => 25, toString: () => '25', [Symbol.toPrimitive]: () => 25 },
      reason: 'Inventario',
      reference: null,
      employeeId: 'emp_001',
      costPrice: null,
      createdAt: new Date(),
    };
    mockPrisma.$transaction.mockResolvedValue([movement]);

    const result = await service.createMovement(prisma(), 'unit_001', {
      stockItemId: 'si_001',
      type: 'ADJUSTMENT',
      quantity: 30, // Set to 30 (absolute value)
      reason: 'Inventario',
    }, 'emp_001');

    expect(result.newStockQuantity).toBe(30); // Absolute set
  });

  it('creates LOW_STOCK alert when below minimum after LOSS', async () => {
    const item = createSampleStockItem({
      quantity: { valueOf: () => 12, toNumber: () => 12, toString: () => '12', [Symbol.toPrimitive]: () => 12 },
      minQuantity: { valueOf: () => 10, toNumber: () => 10, toString: () => '10', [Symbol.toPrimitive]: () => 10 },
    });
    mockPrisma.stockItem.findUnique.mockResolvedValue(item);
    mockPrisma.alert.create.mockResolvedValue({});

    const movement = {
      id: 'mov_004',
      stockItemId: 'si_001',
      type: 'LOSS',
      quantity: { valueOf: () => 5, toNumber: () => 5, toString: () => '5', [Symbol.toPrimitive]: () => 5 },
      reason: 'Quebra',
      reference: null,
      employeeId: 'emp_001',
      costPrice: null,
      createdAt: new Date(),
    };
    mockPrisma.$transaction.mockResolvedValue([movement]);

    await service.createMovement(prisma(), 'unit_001', {
      stockItemId: 'si_001',
      type: 'LOSS',
      quantity: 5,
      reason: 'Quebra',
    }, 'emp_001');

    // 12 - 5 = 7, which is < 10 (minQuantity), so alert should be created
    expect(mockPrisma.alert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'LOW_STOCK',
          severity: 'WARNING',
        }),
      }),
    );
  });
});

// ── List & Filter ───────────────────────────────────────────────────

describe('listStockItems', () => {
  it('returns paginated items', async () => {
    const items = [createSampleStockItem()];
    mockPrisma.stockItem.findMany.mockResolvedValue(items);
    mockPrisma.stockItem.count.mockResolvedValue(1);

    const result = await service.listStockItems(prisma(), 'unit_001', {
      limit: 50,
      offset: 0,
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

// ── Deactivate ──────────────────────────────────────────────────────

describe('deactivateStockItem', () => {
  it('sets isActive to false', async () => {
    const item = createSampleStockItem();
    mockPrisma.stockItem.findUnique.mockResolvedValue(item);
    mockPrisma.stockItem.update.mockResolvedValue({ ...item, isActive: false });

    const result = await service.deactivateStockItem(prisma(), 'si_001', 'unit_001');

    expect(result.isActive).toBe(false);
    expect(mockPrisma.stockItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isActive: false },
      }),
    );
  });
});
