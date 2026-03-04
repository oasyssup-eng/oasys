import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMenuOrder,
  getOrder,
  getMyOrders,
  getCheckSummary,
  initiateOrderPayment,
} from '../menu.service';
import { resolvePricesBatch } from '../price.service';
import type { SessionData } from '../session.service';

// Mock price.service
vi.mock('../price.service', () => ({
  resolvePricesBatch: vi.fn(),
  resolvePrice: vi.fn(),
}));

// Mock ws.handler
vi.mock('../ws.handler', () => ({
  publishOrderEvent: vi.fn(),
}));

// ── Mock Data ───────────────────────────────────────────────────────

const mockTableSession: SessionData = {
  unitId: 'unit_001',
  checkId: 'check_001',
  tableId: 'table_001',
  type: 'TABLE',
  customerName: null,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
};

const mockCounterSession: SessionData = {
  unitId: 'unit_001',
  checkId: 'check_002',
  tableId: null,
  type: 'COUNTER',
  customerName: 'João',
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
};

const mockProductsData = [
  {
    id: 'prod_001',
    unitId: 'unit_001',
    name: 'Chopp Pilsen',
    price: 12.9,
    isAvailable: true,
    modifierGroups: [
      {
        id: 'mg_001',
        name: 'Tamanho',
        min: 1,
        max: 1,
        modifiers: [
          { id: 'mod_001', name: '300ml', price: 0, isAvailable: true },
          { id: 'mod_002', name: '500ml', price: 5, isAvailable: true },
        ],
      },
    ],
  },
  {
    id: 'prod_002',
    unitId: 'unit_001',
    name: 'Porção Fritas',
    price: 25.0,
    isAvailable: true,
    modifierGroups: [],
  },
];

function createMockPrisma() {
  return {
    product: {
      findMany: vi.fn(),
    },
    unit: {
      findUnique: vi.fn(),
    },
    order: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    check: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        order: {
          create: vi.fn().mockImplementation(async (args: { data: { items: { create: unknown[] } }; include: unknown }) => ({
            id: 'order_001',
            checkId: 'check_001',
            status: args.data.items ? 'PENDING' : 'PENDING',
            orderNumber: 42,
            source: 'WEB_MENU',
            createdAt: new Date(),
            items: (args.data.items.create as Array<Record<string, unknown>>).map(
              (item: Record<string, unknown>, idx: number) => ({
                id: `item_${idx}`,
                productId: item.productId,
                product: { name: mockProductsData.find((p) => p.id === item.productId)?.name ?? 'Unknown' },
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                notes: item.notes,
                modifiers: item.modifiers,
              }),
            ),
          })),
        },
      };
      return fn(tx);
    }),
  } as unknown as Parameters<typeof createMenuOrder>[0];
}

describe('Order Service — Create Order', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create order with PENDING status for POST_PAYMENT policy', async () => {
    const prisma = createMockPrisma();
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockProductsData);
    (prisma.unit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      orderPolicy: 'POST_PAYMENT',
    });
    (prisma.order.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const priceMap = new Map([
      ['prod_001', { basePrice: 12.9, effectivePrice: 12.9, priceLabel: null }],
      ['prod_002', { basePrice: 25.0, effectivePrice: 25.0, priceLabel: null }],
    ]);
    (resolvePricesBatch as ReturnType<typeof vi.fn>).mockResolvedValue(priceMap);

    const result = await createMenuOrder(prisma, mockTableSession, [
      { productId: 'prod_001', quantity: 2, modifiers: [{ modifierId: 'mod_001', quantity: 1 }] },
      { productId: 'prod_002', quantity: 1 },
    ]);

    expect(result.status).toBe('PENDING');
    expect(result.paymentRequired).toBe(false);
    expect(result.paymentOptions).toBeNull();
    expect(result.orderNumber).toBeGreaterThan(0);
  });

  it('should create order with HELD status for PRE_PAYMENT policy', async () => {
    const prisma = createMockPrisma();
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockProductsData);
    (prisma.unit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      orderPolicy: 'PRE_PAYMENT',
    });
    (prisma.order.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const priceMap = new Map([
      ['prod_001', { basePrice: 12.9, effectivePrice: 12.9, priceLabel: null }],
    ]);
    (resolvePricesBatch as ReturnType<typeof vi.fn>).mockResolvedValue(priceMap);

    const result = await createMenuOrder(prisma, mockTableSession, [
      { productId: 'prod_001', quantity: 1, modifiers: [{ modifierId: 'mod_001', quantity: 1 }] },
    ]);

    expect(result.status).toBe('HELD');
    expect(result.paymentRequired).toBe(true);
    expect(result.paymentOptions).toEqual({ pix: true, card: true });
  });

  it('should create PENDING order for HYBRID + TABLE context', async () => {
    const prisma = createMockPrisma();
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockProductsData[1]]);
    (prisma.unit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      orderPolicy: 'HYBRID',
    });
    (prisma.order.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const priceMap = new Map([
      ['prod_002', { basePrice: 25.0, effectivePrice: 25.0, priceLabel: null }],
    ]);
    (resolvePricesBatch as ReturnType<typeof vi.fn>).mockResolvedValue(priceMap);

    const result = await createMenuOrder(prisma, mockTableSession, [
      { productId: 'prod_002', quantity: 1 },
    ]);

    expect(result.status).toBe('PENDING');
    expect(result.paymentRequired).toBe(false);
  });

  it('should create HELD order for HYBRID + COUNTER context', async () => {
    const prisma = createMockPrisma();
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockProductsData[1]]);
    (prisma.unit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      orderPolicy: 'HYBRID',
    });
    (prisma.order.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const priceMap = new Map([
      ['prod_002', { basePrice: 25.0, effectivePrice: 25.0, priceLabel: null }],
    ]);
    (resolvePricesBatch as ReturnType<typeof vi.fn>).mockResolvedValue(priceMap);

    const result = await createMenuOrder(prisma, mockCounterSession, [
      { productId: 'prod_002', quantity: 1 },
    ]);

    expect(result.status).toBe('HELD');
    expect(result.paymentRequired).toBe(true);
  });

  it('should throw for unavailable product', async () => {
    const prisma = createMockPrisma();
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...mockProductsData[0], isAvailable: false },
    ]);

    const priceMap = new Map();
    (resolvePricesBatch as ReturnType<typeof vi.fn>).mockResolvedValue(priceMap);

    await expect(
      createMenuOrder(prisma, mockTableSession, [
        { productId: 'prod_001', quantity: 1, modifiers: [{ modifierId: 'mod_001', quantity: 1 }] },
      ]),
    ).rejects.toThrow('indisponível');
  });

  it('should throw for non-existent product', async () => {
    const prisma = createMockPrisma();
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const priceMap = new Map();
    (resolvePricesBatch as ReturnType<typeof vi.fn>).mockResolvedValue(priceMap);

    await expect(
      createMenuOrder(prisma, mockTableSession, [
        { productId: 'prod_999', quantity: 1 },
      ]),
    ).rejects.toThrow('não encontrado');
  });

  it('should throw for missing required modifier', async () => {
    const prisma = createMockPrisma();
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockProductsData);
    (prisma.unit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      orderPolicy: 'POST_PAYMENT',
    });

    const priceMap = new Map([
      ['prod_001', { basePrice: 12.9, effectivePrice: 12.9, priceLabel: null }],
    ]);
    (resolvePricesBatch as ReturnType<typeof vi.fn>).mockResolvedValue(priceMap);

    // prod_001 has min=1 for "Tamanho" group, but no modifiers selected
    await expect(
      createMenuOrder(prisma, mockTableSession, [
        { productId: 'prod_001', quantity: 1 },
      ]),
    ).rejects.toThrow('requer no mínimo');
  });

  it('should throw when exceeding max modifiers', async () => {
    const prisma = createMockPrisma();
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockProductsData);
    (prisma.unit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      orderPolicy: 'POST_PAYMENT',
    });

    const priceMap = new Map([
      ['prod_001', { basePrice: 12.9, effectivePrice: 12.9, priceLabel: null }],
    ]);
    (resolvePricesBatch as ReturnType<typeof vi.fn>).mockResolvedValue(priceMap);

    // max=1 but selecting 2 modifiers
    await expect(
      createMenuOrder(prisma, mockTableSession, [
        {
          productId: 'prod_001',
          quantity: 1,
          modifiers: [
            { modifierId: 'mod_001', quantity: 1 },
            { modifierId: 'mod_002', quantity: 1 },
          ],
        },
      ]),
    ).rejects.toThrow('permite no máximo');
  });

  it('should throw for modifier not belonging to product', async () => {
    const prisma = createMockPrisma();
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockProductsData);

    const priceMap = new Map([
      ['prod_002', { basePrice: 25.0, effectivePrice: 25.0, priceLabel: null }],
    ]);
    (resolvePricesBatch as ReturnType<typeof vi.fn>).mockResolvedValue(priceMap);

    // prod_002 has no modifier groups, trying to add a modifier from prod_001
    await expect(
      createMenuOrder(prisma, mockTableSession, [
        {
          productId: 'prod_002',
          quantity: 1,
          modifiers: [{ modifierId: 'mod_001', quantity: 1 }],
        },
      ]),
    ).rejects.toThrow('não pertence');
  });
});

describe('Order Service — Get Order', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return order detail', async () => {
    const prisma = createMockPrisma();
    (prisma.order.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'order_001',
      checkId: 'check_001',
      status: 'PREPARING',
      orderNumber: 42,
      createdAt: new Date('2026-03-04'),
      items: [
        {
          id: 'item_001',
          productId: 'prod_001',
          product: { name: 'Chopp Pilsen' },
          quantity: 2,
          unitPrice: 12.9,
          totalPrice: 25.8,
          notes: 'Bem gelado',
          modifiers: [],
        },
      ],
    });

    const result = await getOrder(prisma, 'order_001', 'check_001');

    expect(result.id).toBe('order_001');
    expect(result.status).toBe('PREPARING');
    expect(result.orderNumber).toBe(42);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.productName).toBe('Chopp Pilsen');
  });

  it('should throw 404 for order not found', async () => {
    const prisma = createMockPrisma();
    (prisma.order.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(getOrder(prisma, 'order_999', 'check_001')).rejects.toThrow(
      'Pedido não encontrado',
    );
  });

  it('should throw 404 for order belonging to different check', async () => {
    const prisma = createMockPrisma();
    (prisma.order.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'order_001',
      checkId: 'check_other',
      status: 'PENDING',
      items: [],
    });

    await expect(getOrder(prisma, 'order_001', 'check_001')).rejects.toThrow(
      'Pedido não encontrado',
    );
  });
});

describe('Order Service — List My Orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all orders for the check', async () => {
    const prisma = createMockPrisma();
    (prisma.order.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'order_001',
        checkId: 'check_001',
        status: 'DELIVERED',
        orderNumber: 41,
        createdAt: new Date(),
        items: [],
      },
      {
        id: 'order_002',
        checkId: 'check_001',
        status: 'PREPARING',
        orderNumber: 42,
        createdAt: new Date(),
        items: [],
      },
    ]);

    const result = await getMyOrders(prisma, 'check_001');
    expect(result).toHaveLength(2);
  });
});

describe('Order Service — Check Summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return check summary with totals', async () => {
    const prisma = createMockPrisma();
    (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'check_001',
      unitId: 'unit_001',
      status: 'OPEN',
      tableId: 'table_001',
      table: { number: 5 },
      serviceFeeAmount: 10,
      tipAmount: null,
      discountAmount: null,
      orders: [
        {
          id: 'order_001',
          status: 'DELIVERED',
          orderNumber: 42,
          items: [
            {
              id: 'item_001',
              productId: 'prod_001',
              product: { name: 'Chopp' },
              quantity: 2,
              unitPrice: 12.9,
              totalPrice: 25.8,
              notes: null,
              modifiers: [],
            },
          ],
        },
      ],
      payments: [
        { id: 'pay_001', method: 'PIX', amount: 20, status: 'CONFIRMED' },
      ],
    });

    const result = await getCheckSummary(prisma, 'check_001', 'unit_001');

    expect(result.tableNumber).toBe(5);
    expect(result.itemsTotal).toBe(25.8);
    expect(result.serviceFeeAmount).toBe(10);
    expect(result.grossTotal).toBe(35.8); // 25.8 + 10
    expect(result.totalPaid).toBe(20);
    expect(result.remainingBalance).toBeCloseTo(15.8, 1);
  });

  it('should throw 404 for non-existent check', async () => {
    const prisma = createMockPrisma();
    (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      getCheckSummary(prisma, 'check_999', 'unit_001'),
    ).rejects.toThrow('Conta não encontrada');
  });
});

describe('Order Service — Initiate Payment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return payment info for HELD order', async () => {
    const prisma = createMockPrisma();
    (prisma.order.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'order_001',
      checkId: 'check_001',
      status: 'HELD',
      items: [
        { totalPrice: 25.8 },
        { totalPrice: 12.0 },
      ],
    });

    const result = await initiateOrderPayment(
      prisma,
      'order_001',
      'check_001',
      'unit_001',
      { method: 'PIX' },
    );

    expect(result.orderTotal).toBe(37.8);
    expect(result.method).toBe('PIX');
  });

  it('should throw for non-HELD order', async () => {
    const prisma = createMockPrisma();
    (prisma.order.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'order_001',
      checkId: 'check_001',
      status: 'PENDING',
      items: [],
    });

    await expect(
      initiateOrderPayment(prisma, 'order_001', 'check_001', 'unit_001', {
        method: 'PIX',
      }),
    ).rejects.toThrow('não requer pagamento antecipado');
  });

  it('should throw for order not found', async () => {
    const prisma = createMockPrisma();
    (prisma.order.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      initiateOrderPayment(prisma, 'order_999', 'check_001', 'unit_001', {
        method: 'PIX',
      }),
    ).rejects.toThrow('Pedido não encontrado');
  });
});
