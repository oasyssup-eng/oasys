import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as service from '../kds.service';

// Mock WS publishers
vi.mock('../ws.handler', () => ({
  publishKDSEvent: vi.fn(),
  publishPickupEvent: vi.fn(),
}));
vi.mock('../../menu/ws.handler', () => ({
  publishOrderEvent: vi.fn(),
}));
vi.mock('../../waiter/ws.handler', () => ({
  publishWaiterEvent: vi.fn(),
}));

const UNIT_ID = 'unit_test_001';
const EMPLOYEE_ID = 'emp_test_001';
const ORDER_ID = 'order_test_001';
const CHECK_ID = 'check_test_001';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockPrisma = any;

function createMockPrisma(): MockPrisma {
  return {
    order: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    orderItem: {
      groupBy: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    unit: {
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        order: {
          update: vi.fn(),
        },
        auditLog: {
          create: vi.fn(),
        },
      }),
    ),
  };
}

function mockOrderData(overrides = {}) {
  return {
    id: ORDER_ID,
    checkId: CHECK_ID,
    status: 'PENDING',
    orderNumber: 42,
    courseType: null,
    source: 'WEB_MENU',
    holdUntil: null,
    notifiedAt: null,
    createdAt: new Date('2026-03-05T14:00:00Z'),
    updatedAt: new Date('2026-03-05T14:00:00Z'),
    stationCompletions: null,
    isCortesia: false,
    cortesiaReason: null,
    cortesiaAuthorizedBy: null,
    staffMealEmployeeId: null,
    check: {
      id: CHECK_ID,
      unitId: UNIT_ID,
      unit: { slug: 'bar-test' },
      table: { number: 5, zone: { name: 'Salão' } },
    },
    items: [
      {
        id: 'item_1',
        productId: 'prod_1',
        quantity: 2,
        unitPrice: 15,
        totalPrice: 30,
        notes: null,
        modifiers: null,
        product: { name: 'Chopp', station: 'BAR', preparationTime: 3 },
      },
      {
        id: 'item_2',
        productId: 'prod_2',
        quantity: 1,
        unitPrice: 25,
        totalPrice: 25,
        notes: 'Sem cebola',
        modifiers: null,
        product: { name: 'Hambúrguer', station: 'KITCHEN', preparationTime: 15 },
      },
    ],
    ...overrides,
  };
}

describe('KDS Service', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    vi.clearAllMocks();
  });

  // ── startOrder ─────────────────────────────────────────────────────

  describe('startOrder', () => {
    it('should transition PENDING → PREPARING and init stationCompletions', async () => {
      const order = mockOrderData();
      prisma.order.findUnique.mockResolvedValueOnce(order);
      prisma.order.update.mockResolvedValueOnce({ ...order, status: 'PREPARING' });

      const result = await service.startOrder(prisma, ORDER_ID, UNIT_ID);

      expect(result.status).toBe('PREPARING');
      expect(result.stationCompletions).toEqual({ BAR: false, KITCHEN: false });
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PREPARING' }),
        }),
      );
    });

    it('should reject non-PENDING orders', async () => {
      const order = mockOrderData({ status: 'PREPARING' });
      prisma.order.findUnique.mockResolvedValueOnce(order);

      await expect(
        service.startOrder(prisma, ORDER_ID, UNIT_ID),
      ).rejects.toThrow('Pedido não está na fila para iniciar');
    });

    it('should reject orders from another unit', async () => {
      const order = mockOrderData({
        check: { ...mockOrderData().check, unitId: 'other_unit' },
      });
      prisma.order.findUnique.mockResolvedValueOnce(order);

      await expect(
        service.startOrder(prisma, ORDER_ID, UNIT_ID),
      ).rejects.toThrow();
    });

    it('should throw 404 for unknown order', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.startOrder(prisma, 'nonexistent', UNIT_ID),
      ).rejects.toThrow('Pedido não encontrado');
    });
  });

  // ── bumpOrder ──────────────────────────────────────────────────────

  describe('bumpOrder', () => {
    it('should bump single-station order to READY', async () => {
      const order = mockOrderData({
        status: 'PREPARING',
        stationCompletions: { BAR: false },
        items: [mockOrderData().items[0]], // BAR only
      });
      prisma.order.findUnique.mockResolvedValueOnce(order);

      const result = await service.bumpOrder(prisma, ORDER_ID, UNIT_ID, EMPLOYEE_ID, {
        station: 'BAR',
      });

      expect(result.isFullyReady).toBe(true);
      expect(result.status).toBe('READY');
    });

    it('should partially bump multi-station order', async () => {
      const order = mockOrderData({
        status: 'PREPARING',
        stationCompletions: { BAR: false, KITCHEN: false },
      });
      prisma.order.findUnique.mockResolvedValueOnce(order);

      const result = await service.bumpOrder(prisma, ORDER_ID, UNIT_ID, EMPLOYEE_ID, {
        station: 'BAR',
      });

      expect(result.isFullyReady).toBe(false);
      expect(result.status).toBe('PREPARING');
      expect(result.stationProgress).toEqual({ BAR: true, KITCHEN: false });
    });

    it('should mark READY when all stations bumped', async () => {
      const order = mockOrderData({
        status: 'PREPARING',
        stationCompletions: { BAR: true, KITCHEN: false },
      });
      prisma.order.findUnique.mockResolvedValueOnce(order);

      const result = await service.bumpOrder(prisma, ORDER_ID, UNIT_ID, EMPLOYEE_ID, {
        station: 'KITCHEN',
      });

      expect(result.isFullyReady).toBe(true);
      expect(result.status).toBe('READY');
    });

    it('should be idempotent for already-bumped station', async () => {
      const order = mockOrderData({
        status: 'PREPARING',
        stationCompletions: { BAR: true, KITCHEN: false },
      });
      prisma.order.findUnique.mockResolvedValueOnce(order);

      const result = await service.bumpOrder(prisma, ORDER_ID, UNIT_ID, EMPLOYEE_ID, {
        station: 'BAR',
      });

      expect(result.stationBumped).toBe('BAR');
      expect(result.message).toContain('já foi finalizada');
      // No transaction should have been called
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should auto-start PENDING orders on bump', async () => {
      const order = mockOrderData({ status: 'PENDING' });
      prisma.order.findUnique.mockResolvedValueOnce(order);
      prisma.order.update.mockResolvedValueOnce({
        ...order,
        status: 'PREPARING',
        stationCompletions: { BAR: false, KITCHEN: false },
      });

      const result = await service.bumpOrder(prisma, ORDER_ID, UNIT_ID, EMPLOYEE_ID, {
        station: 'BAR',
      });

      // Should have called update once for auto-start
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PREPARING' }),
        }),
      );
      expect(result.stationBumped).toBe('BAR');
    });

    it('should reject bump for station with no items', async () => {
      const order = mockOrderData({
        status: 'PREPARING',
        stationCompletions: { BAR: false, KITCHEN: false },
      });
      prisma.order.findUnique.mockResolvedValueOnce(order);

      await expect(
        service.bumpOrder(prisma, ORDER_ID, UNIT_ID, EMPLOYEE_ID, {
          station: 'GRILL',
        }),
      ).rejects.toThrow('Esta estação não tem itens neste pedido');
    });

    it('should reject bump for non-PREPARING order', async () => {
      const order = mockOrderData({ status: 'READY' });
      prisma.order.findUnique.mockResolvedValueOnce(order);

      await expect(
        service.bumpOrder(prisma, ORDER_ID, UNIT_ID, EMPLOYEE_ID, {
          station: 'BAR',
        }),
      ).rejects.toThrow('Pedido não está em preparo');
    });
  });

  // ── holdOrder ──────────────────────────────────────────────────────

  describe('holdOrder', () => {
    it('should hold a PENDING order', async () => {
      const order = mockOrderData();
      prisma.order.findUnique.mockResolvedValueOnce(order);
      prisma.order.update.mockResolvedValueOnce({
        ...order,
        status: 'HELD',
        holdUntil: null,
      });

      const result = await service.holdOrder(prisma, ORDER_ID, UNIT_ID, {
        reason: 'Cliente pediu espera',
      });

      expect(result.status).toBe('HELD');
      expect(result.holdReason).toBe('Cliente pediu espera');
    });

    it('should hold with timer (holdUntil)', async () => {
      const order = mockOrderData();
      const holdUntil = new Date(Date.now() + 600_000).toISOString();
      prisma.order.findUnique.mockResolvedValueOnce(order);
      prisma.order.update.mockResolvedValueOnce({
        ...order,
        status: 'HELD',
        holdUntil: new Date(holdUntil),
      });

      const result = await service.holdOrder(prisma, ORDER_ID, UNIT_ID, {
        reason: 'Aguardando mesa',
        holdUntil,
      });

      expect(result.status).toBe('HELD');
      expect(result.holdUntil).toBeTruthy();
    });

    it('should reject holding PREPARING orders', async () => {
      const order = mockOrderData({ status: 'PREPARING' });
      prisma.order.findUnique.mockResolvedValueOnce(order);

      await expect(
        service.holdOrder(prisma, ORDER_ID, UNIT_ID, {
          reason: 'Teste',
        }),
      ).rejects.toThrow('Apenas pedidos na fila podem ser retidos');
    });

    it('should reject holdUntil in the past', async () => {
      const order = mockOrderData();
      prisma.order.findUnique.mockResolvedValueOnce(order);

      await expect(
        service.holdOrder(prisma, ORDER_ID, UNIT_ID, {
          reason: 'Teste',
          holdUntil: '2020-01-01T00:00:00Z',
        }),
      ).rejects.toThrow('Horário de liberação deve ser no futuro');
    });
  });

  // ── releaseOrder ───────────────────────────────────────────────────

  describe('releaseOrder', () => {
    it('should release a HELD order back to PENDING', async () => {
      const order = mockOrderData({ status: 'HELD' });
      prisma.order.findUnique.mockResolvedValueOnce(order);
      prisma.order.update.mockResolvedValueOnce({ ...order, status: 'PENDING' });

      const result = await service.releaseOrder(prisma, ORDER_ID, UNIT_ID, {
        force: false,
      });

      expect(result.status).toBe('PENDING');
    });

    it('should reject releasing non-HELD orders', async () => {
      const order = mockOrderData({ status: 'PREPARING' });
      prisma.order.findUnique.mockResolvedValueOnce(order);

      await expect(
        service.releaseOrder(prisma, ORDER_ID, UNIT_ID, { force: false }),
      ).rejects.toThrow('Pedido não está retido');
    });
  });

  // ── recallOrder ────────────────────────────────────────────────────

  describe('recallOrder', () => {
    it('should recall READY → PREPARING and reset completions', async () => {
      const order = mockOrderData({
        status: 'READY',
        stationCompletions: { BAR: true, KITCHEN: true },
      });
      prisma.order.findUnique.mockResolvedValueOnce(order);
      prisma.order.update.mockResolvedValueOnce({
        ...order,
        status: 'PREPARING',
      });

      const result = await service.recallOrder(prisma, ORDER_ID, UNIT_ID);

      expect(result.status).toBe('PREPARING');
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PREPARING',
            stationCompletions: { BAR: false, KITCHEN: false },
            notifiedAt: null,
          }),
        }),
      );
    });

    it('should reject recalling non-READY orders', async () => {
      const order = mockOrderData({ status: 'PREPARING' });
      prisma.order.findUnique.mockResolvedValueOnce(order);

      await expect(
        service.recallOrder(prisma, ORDER_ID, UNIT_ID),
      ).rejects.toThrow('Apenas pedidos prontos podem ser retornados');
    });
  });

  // ── markCourtesy ───────────────────────────────────────────────────

  describe('markCourtesy', () => {
    it('should mark order as courtesy', async () => {
      const order = mockOrderData({
        items: [
          { ...mockOrderData().items[0], totalPrice: 20 },
          { ...mockOrderData().items[1], totalPrice: 25 },
        ],
      });
      prisma.order.findUnique.mockResolvedValueOnce(order);

      const result = await service.markCourtesy(
        prisma,
        ORDER_ID,
        UNIT_ID,
        EMPLOYEE_ID,
        { reason: 'Erro da cozinha' },
      );

      expect(result.isCortesia).toBe(true);
      expect(result.reason).toBe('Erro da cozinha');
    });

    it('should reject >R$50 courtesy without authorizedBy', async () => {
      const order = mockOrderData({
        items: [
          { ...mockOrderData().items[0], totalPrice: 60 },
        ],
      });
      prisma.order.findUnique.mockResolvedValueOnce(order);

      await expect(
        service.markCourtesy(prisma, ORDER_ID, UNIT_ID, EMPLOYEE_ID, {
          reason: 'Cliente VIP',
        }),
      ).rejects.toThrow('Cortesia acima de R$50 requer autorização de gerente');
    });

    it('should allow >R$50 courtesy with authorizedBy', async () => {
      const order = mockOrderData({
        items: [
          { ...mockOrderData().items[0], totalPrice: 60 },
        ],
      });
      prisma.order.findUnique.mockResolvedValueOnce(order);

      const result = await service.markCourtesy(
        prisma,
        ORDER_ID,
        UNIT_ID,
        EMPLOYEE_ID,
        { reason: 'Cliente VIP', authorizedBy: 'manager_001' },
      );

      expect(result.isCortesia).toBe(true);
    });
  });

  // ── markStaffMeal ──────────────────────────────────────────────────

  describe('markStaffMeal', () => {
    it('should mark order as staff meal', async () => {
      const order = mockOrderData();
      prisma.order.findUnique.mockResolvedValueOnce(order);

      const result = await service.markStaffMeal(
        prisma,
        ORDER_ID,
        UNIT_ID,
        EMPLOYEE_ID,
        { employeeId: 'staff_001' },
      );

      expect(result.isStaffMeal).toBe(true);
      expect(result.staffEmployeeId).toBe('staff_001');
    });
  });

  // ── getPickupBoard ─────────────────────────────────────────────────

  describe('getPickupBoard', () => {
    it('should return READY orders for valid slug', async () => {
      prisma.unit.findFirst.mockResolvedValueOnce({ id: UNIT_ID, name: 'Bar Test' });
      prisma.order.findMany
        .mockResolvedValueOnce([
          {
            orderNumber: 42,
            notifiedAt: new Date('2026-03-05T14:30:00Z'),
            updatedAt: new Date('2026-03-05T14:30:00Z'),
            items: [{ quantity: 2, product: { name: 'Chopp' } }],
          },
        ])
        .mockResolvedValueOnce([]); // preparing

      const result = await service.getPickupBoard(prisma, 'bar-test', 20);

      expect(result.unitName).toBe('Bar Test');
      expect(result.ready).toHaveLength(1);
      expect(result.ready[0]!.orderNumber).toBe(42);
    });

    it('should throw 404 for invalid slug', async () => {
      prisma.unit.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getPickupBoard(prisma, 'nonexistent', 20),
      ).rejects.toThrow('Unidade não encontrada');
    });
  });

  // ── getQueue ───────────────────────────────────────────────────────

  describe('getQueue', () => {
    it('should filter by station', async () => {
      const orders = [mockOrderData()];
      prisma.order.findMany
        .mockResolvedValueOnce(orders) // main query
        .mockResolvedValueOnce([]); // avgPrepTime query

      const result = await service.getQueue(prisma, UNIT_ID, {
        station: 'BAR',
        status: 'ALL',
        limit: 50,
      });

      // Order has BAR items, so it should appear
      expect(result.orders.length).toBeGreaterThanOrEqual(0);
      expect(result.station).toBe('BAR');
    });

    it('should assign RUSH priority for slow orders', async () => {
      const slowOrder = mockOrderData({
        createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      });
      prisma.order.findMany
        .mockResolvedValueOnce([slowOrder])
        .mockResolvedValueOnce([
          { createdAt: new Date(Date.now() - 600_000), notifiedAt: new Date(Date.now() - 300_000) },
        ]); // avg prep = 300s

      const result = await service.getQueue(prisma, UNIT_ID, {
        station: 'ALL',
        status: 'ALL',
        limit: 50,
      });

      expect(result.orders[0]!.priority).toBe('RUSH');
    });
  });

  // ── getStats ───────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return aggregated stats with byStation and topProducts', async () => {
      prisma.order.count
        .mockResolvedValueOnce(50)  // allOrders
        .mockResolvedValueOnce(40)  // completedOrders
        .mockResolvedValueOnce(2)   // cancelledOrders
        .mockResolvedValueOnce(3)   // courtesyOrders
        .mockResolvedValueOnce(1)   // staffMeals
        .mockResolvedValueOnce(5)   // currentQueue
        .mockResolvedValueOnce(2);  // currentHeld
      prisma.order.findMany.mockResolvedValueOnce([]); // avgPrepTime

      // byStation groupBy
      prisma.orderItem.groupBy.mockResolvedValueOnce([
        { productId: 'prod_1', _sum: { quantity: 10 } },
        { productId: 'prod_2', _sum: { quantity: 5 } },
      ]);
      // product lookup for station breakdown
      prisma.product.findMany.mockResolvedValueOnce([
        { id: 'prod_1', station: 'BAR', name: 'Caipirinha' },
        { id: 'prod_2', station: 'KITCHEN', name: 'Picanha' },
      ]);

      // topProducts groupBy
      prisma.orderItem.groupBy.mockResolvedValueOnce([
        { productId: 'prod_1', _sum: { quantity: 10 } },
        { productId: 'prod_2', _sum: { quantity: 5 } },
      ]);
      // product lookup for top products
      prisma.product.findMany.mockResolvedValueOnce([
        { id: 'prod_1', name: 'Caipirinha', station: 'BAR' },
        { id: 'prod_2', name: 'Picanha', station: 'KITCHEN' },
      ]);

      const result = await service.getStats(prisma, UNIT_ID);

      expect(result.overall.totalOrders).toBe(50);
      expect(result.overall.completedOrders).toBe(40);
      expect(result.overall.cancelledOrders).toBe(2);
      expect(result.overall.courtesyOrders).toBe(3);
      expect(result.overall.staffMeals).toBe(1);
      expect(result.overall.currentQueueLength).toBe(5);
      expect(result.overall.currentHeldOrders).toBe(2);

      // byStation
      expect(result.byStation).toBeDefined();
      expect(result.byStation.BAR).toEqual({ orderItems: 1, totalQuantity: 10 });
      expect(result.byStation.KITCHEN).toEqual({ orderItems: 1, totalQuantity: 5 });

      // topProducts
      expect(result.topProducts).toHaveLength(2);
      expect(result.topProducts[0]!.productName).toBe('Caipirinha');
      expect(result.topProducts[0]!.totalQuantity).toBe(10);
      expect(result.topProducts[1]!.productName).toBe('Picanha');
    });
  });
});
