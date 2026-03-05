import type { PrismaClient, OrderStatus } from '@oasys/database';
import { AppError } from '../../lib/errors';
import { publishOrderEvent } from '../menu/ws.handler';
import { publishWaiterEvent } from '../waiter/ws.handler';
import { publishKDSEvent, publishPickupEvent } from './ws.handler';
import { getNextCourseToRelease } from './course-sequencer';
import { deductStockForOrder } from '../stock/deduction.service';
import type {
  KDSQueueQuery,
  BumpOrderInput,
  HoldOrderInput,
  ReleaseOrderInput,
  CourtesyInput,
  StaffMealInput,
} from './kds.schemas';

// ── Helpers ─────────────────────────────────────────────────────────

function parseStationCompletions(json: unknown): Record<string, boolean> {
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    return json as Record<string, boolean>;
  }
  return {};
}

function computeRequiredStations(
  items: Array<{ product: { station: string | null } }>,
): Set<string> {
  const stations = new Set<string>();
  for (const item of items) {
    if (item.product.station) {
      stations.add(item.product.station);
    }
  }
  return stations;
}

function initStationCompletions(stations: Set<string>): Record<string, boolean> {
  const completions: Record<string, boolean> = {};
  for (const s of stations) {
    completions[s] = false;
  }
  return completions;
}

function isAllStationsComplete(
  completions: Record<string, boolean>,
  stations: Set<string>,
): boolean {
  for (const s of stations) {
    if (!completions[s]) return false;
  }
  return true;
}

// ── Get Queue ───────────────────────────────────────────────────────

export async function getQueue(
  prisma: PrismaClient,
  unitId: string,
  query: KDSQueueQuery,
) {
  const statusFilter: OrderStatus[] =
    query.status === 'ALL'
      ? ['PENDING', 'PREPARING', 'HELD']
      : [query.status as OrderStatus];

  const orders = await prisma.order.findMany({
    where: {
      check: { unitId },
      status: { in: statusFilter },
    },
    include: {
      items: {
        include: {
          product: { select: { name: true, station: true, preparationTime: true } },
        },
      },
      check: {
        select: {
          table: { select: { number: true, zone: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: query.limit,
  });

  const now = Date.now();

  // Compute average prep time for priority calculation
  const avgPrepSeconds = await getAvgPrepTime(prisma, unitId);

  const mapped = orders
    .filter((order) => {
      if (query.station === 'ALL') return true;
      return order.items.some((item) => item.product.station === query.station);
    })
    .map((order) => {
      const elapsedSeconds = Math.floor((now - order.createdAt.getTime()) / 1000);
      const completions = parseStationCompletions(order.stationCompletions);

      let priority = 'NORMAL';
      if (order.status === 'HELD') {
        priority = 'HELD';
      } else if (avgPrepSeconds > 0) {
        if (elapsedSeconds > avgPrepSeconds * 2) priority = 'RUSH';
        else if (elapsedSeconds > avgPrepSeconds * 1.5) priority = 'DELAYED';
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        source: order.source,
        courseType: order.courseType,
        tableNumber: order.check.table?.number ?? null,
        zoneName: order.check.table?.zone?.name ?? null,
        createdAt: order.createdAt.toISOString(),
        elapsedSeconds,
        isHeld: order.status === 'HELD',
        holdUntil: order.holdUntil?.toISOString() ?? null,
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.product.name,
          quantity: item.quantity,
          station: item.product.station,
          isThisStation: query.station === 'ALL' || item.product.station === query.station,
          modifiers: item.modifiers ?? null,
          notes: item.notes,
        })),
        stationProgress: completions,
        priority,
      };
    });

  // Separate held orders
  const active = mapped.filter((o) => o.status !== 'HELD');
  const held = mapped.filter((o) => o.status === 'HELD');

  return {
    station: query.station,
    queueLength: active.length,
    avgPrepTime: avgPrepSeconds,
    orders: active,
    heldOrders: held,
  };
}

// ── Get Ready Queue ─────────────────────────────────────────────────

export async function getReadyQueue(
  prisma: PrismaClient,
  unitId: string,
  limit: number,
) {
  const orders = await prisma.order.findMany({
    where: {
      check: { unitId },
      status: 'READY',
    },
    include: {
      items: {
        include: {
          product: { select: { name: true, station: true } },
        },
      },
      check: {
        select: {
          table: { select: { number: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });

  return {
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      source: order.source,
      tableNumber: order.check.table?.number ?? null,
      readyAt: order.notifiedAt?.toISOString() ?? order.updatedAt.toISOString(),
      items: order.items.map((item) => ({
        productName: item.product.name,
        quantity: item.quantity,
      })),
    })),
  };
}

// ── Start Order ─────────────────────────────────────────────────────

export async function startOrder(
  prisma: PrismaClient,
  orderId: string,
  unitId: string,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      check: { select: { unitId: true } },
      items: {
        include: { product: { select: { station: true } } },
      },
    },
  });

  if (!order) throw AppError.notFound('Pedido não encontrado');
  if (order.check.unitId !== unitId) throw AppError.forbidden();
  if (order.status !== 'PENDING') {
    throw AppError.badRequest('Pedido não está na fila para iniciar');
  }

  const stations = computeRequiredStations(order.items);
  const completions = initStationCompletions(stations);

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'PREPARING',
      stationCompletions: completions,
    },
  });

  publishKDSEvent(unitId, {
    event: 'order.preparing',
    timestamp: new Date().toISOString(),
    data: { orderId, orderNumber: order.orderNumber },
  });

  // Fire-and-forget stock deduction — must NOT block order production
  try {
    await deductStockForOrder(prisma, orderId, unitId);
  } catch (err) {
    console.error('[stock-deduction] Failed for order', orderId, err);
  }

  return {
    orderId,
    status: updated.status,
    stationCompletions: completions,
    message: `Pedido #${order.orderNumber ?? orderId.slice(-4)} em preparo.`,
  };
}

// ── Bump Order ──────────────────────────────────────────────────────

export async function bumpOrder(
  prisma: PrismaClient,
  orderId: string,
  unitId: string,
  employeeId: string,
  input: BumpOrderInput,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      check: {
        select: {
          id: true,
          unitId: true,
          unit: { select: { slug: true } },
          table: { select: { number: true, zone: { select: { name: true } } } },
        },
      },
      items: {
        include: {
          product: { select: { name: true, station: true, preparationTime: true } },
        },
      },
    },
  });

  if (!order) throw AppError.notFound('Pedido não encontrado');
  if (order.check.unitId !== unitId) throw AppError.forbidden();

  // Auto-start if still PENDING (R1)
  if (order.status === 'PENDING') {
    const stations = computeRequiredStations(order.items);
    const completions = initStationCompletions(stations);
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PREPARING', stationCompletions: completions },
    });
    order.status = 'PREPARING';
    order.stationCompletions = completions;

    // Fire-and-forget stock deduction on auto-start
    try {
      await deductStockForOrder(prisma, orderId, unitId);
    } catch (err) {
      console.error('[stock-deduction] Failed for auto-started order', orderId, err);
    }
  }

  if (order.status !== 'PREPARING') {
    throw AppError.badRequest('Pedido não está em preparo');
  }

  // Validate station has items (R2)
  const stationItems = order.items.filter(
    (item) => item.product.station === input.station,
  );
  if (stationItems.length === 0) {
    throw AppError.badRequest('Esta estação não tem itens neste pedido');
  }

  // Parse current completions
  const completions = parseStationCompletions(order.stationCompletions);
  const stations = computeRequiredStations(order.items);

  // Idempotent check (R3)
  if (completions[input.station] === true) {
    return {
      orderId,
      orderNumber: order.orderNumber,
      stationBumped: input.station,
      stationProgress: completions,
      isFullyReady: isAllStationsComplete(completions, stations),
      status: order.status,
      message: `Estação ${input.station} já foi finalizada.`,
    };
  }

  // Update station completion
  completions[input.station] = true;
  const allReady = isAllStationsComplete(completions, stations);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = {
      stationCompletions: completions,
    };

    if (allReady) {
      updateData.status = 'READY';
      updateData.notifiedAt = now;
    }

    await tx.order.update({
      where: { id: orderId },
      data: updateData,
    });

    // Audit log for bump
    await tx.auditLog.create({
      data: {
        unitId,
        employeeId,
        action: allReady ? 'ORDER_READY' : 'ORDER_STATION_BUMPED',
        entity: 'Order',
        entityId: orderId,
        after: { station: input.station, allReady },
      },
    });
  });

  const slug = order.check.unit?.slug;

  // Publish KDS event
  publishKDSEvent(unitId, {
    event: allReady ? 'order.ready' : 'order.station_bumped',
    timestamp: now.toISOString(),
    data: {
      orderId,
      orderNumber: order.orderNumber,
      station: input.station,
      stationProgress: completions,
      isFullyReady: allReady,
    },
  });

  if (allReady) {
    // Notify waiter
    publishWaiterEvent(unitId, {
      event: 'order.ready',
      timestamp: now.toISOString(),
      data: {
        orderId,
        orderNumber: order.orderNumber,
        tableNumber: order.check.table?.number,
        zoneName: order.check.table?.zone?.name,
      },
    });

    // Notify web-menu client
    publishOrderEvent(orderId, {
      event: 'order.ready',
      orderId,
      orderNumber: order.orderNumber,
      timestamp: now.toISOString(),
      data: {
        tableNumber: order.check.table?.number,
        items: order.items.map((i) => `${i.quantity}x ${i.product.name}`),
        message: `Seu pedido #${order.orderNumber ?? ''} está pronto!`,
      },
    });

    // Notify pickup board
    if (slug) {
      publishPickupEvent(slug, {
        event: 'pickup.added',
        timestamp: now.toISOString(),
        data: {
          orderId,
          orderNumber: order.orderNumber,
          items: order.items.map((i) => `${i.quantity}x ${i.product.name}`),
        },
      });
    }

    // Course sequencing: release next course
    if (order.courseType) {
      const courseTypes = order.items.map((i) => i.product.station); // We need courseType from items — but courseType is on Order, not OrderItem
      // For now, course sequencing releases other orders in the same check with the next courseType
      const nextCourse = getNextCourseToRelease(
        order.courseType,
        [], // placeholder, logic uses check-level queries below
      );

      if (nextCourse) {
        // Find held orders of the next course in the same check
        const heldOrders = await prisma.order.findMany({
          where: {
            checkId: order.checkId,
            courseType: nextCourse,
            status: 'HELD',
          },
        });

        for (const held of heldOrders) {
          await prisma.order.update({
            where: { id: held.id },
            data: { status: 'PENDING', holdUntil: null },
          });

          publishKDSEvent(unitId, {
            event: 'order.released',
            timestamp: now.toISOString(),
            data: {
              orderId: held.id,
              orderNumber: held.orderNumber,
              reason: `Curso ${order.courseType} concluído`,
            },
          });
        }
      }
    }
  }

  return {
    orderId,
    orderNumber: order.orderNumber,
    stationBumped: input.station,
    stationProgress: completions,
    isFullyReady: allReady,
    status: allReady ? 'READY' : 'PREPARING',
    message: allReady
      ? `Pedido #${order.orderNumber ?? ''} PRONTO! Mesa ${order.check.table?.number ?? '?'} notificada.`
      : `${input.station} concluiu. Aguardando ${[...stations].filter((s) => !completions[s]).join(', ')}.`,
  };
}

// ── Hold Order ──────────────────────────────────────────────────────

export async function holdOrder(
  prisma: PrismaClient,
  orderId: string,
  unitId: string,
  input: HoldOrderInput,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { check: { select: { unitId: true } } },
  });

  if (!order) throw AppError.notFound('Pedido não encontrado');
  if (order.check.unitId !== unitId) throw AppError.forbidden();
  if (order.status !== 'PENDING') {
    throw AppError.badRequest('Apenas pedidos na fila podem ser retidos. Pedidos em preparo não podem ser segurados.');
  }

  if (input.holdUntil) {
    const holdDate = new Date(input.holdUntil);
    if (holdDate <= new Date()) {
      throw AppError.badRequest('Horário de liberação deve ser no futuro');
    }
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'HELD',
      holdUntil: input.holdUntil ? new Date(input.holdUntil) : null,
    },
  });

  publishKDSEvent(unitId, {
    event: 'order.held',
    timestamp: new Date().toISOString(),
    data: {
      orderId,
      orderNumber: order.orderNumber,
      reason: input.reason,
      holdUntil: updated.holdUntil?.toISOString() ?? null,
    },
  });

  return {
    orderId,
    orderNumber: order.orderNumber,
    status: 'HELD',
    holdReason: input.reason,
    holdUntil: updated.holdUntil?.toISOString() ?? null,
    message: updated.holdUntil
      ? `Pedido #${order.orderNumber ?? ''} retido. Liberação automática em ${Math.ceil((updated.holdUntil.getTime() - Date.now()) / 60000)} min.`
      : `Pedido #${order.orderNumber ?? ''} retido. Liberação manual.`,
  };
}

// ── Release Order ───────────────────────────────────────────────────

export async function releaseOrder(
  prisma: PrismaClient,
  orderId: string,
  unitId: string,
  _input: ReleaseOrderInput,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { check: { select: { unitId: true } } },
  });

  if (!order) throw AppError.notFound('Pedido não encontrado');
  if (order.check.unitId !== unitId) throw AppError.forbidden();
  if (order.status !== 'HELD') {
    throw AppError.badRequest('Pedido não está retido');
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'PENDING', holdUntil: null },
  });

  publishKDSEvent(unitId, {
    event: 'order.released',
    timestamp: new Date().toISOString(),
    data: { orderId, orderNumber: order.orderNumber },
  });

  return {
    orderId,
    orderNumber: order.orderNumber,
    status: 'PENDING',
    message: `Pedido #${order.orderNumber ?? ''} liberado.`,
  };
}

// ── Recall Order ────────────────────────────────────────────────────

export async function recallOrder(
  prisma: PrismaClient,
  orderId: string,
  unitId: string,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      check: { select: { unitId: true } },
      items: {
        include: { product: { select: { station: true } } },
      },
    },
  });

  if (!order) throw AppError.notFound('Pedido não encontrado');
  if (order.check.unitId !== unitId) throw AppError.forbidden();
  if (order.status !== 'READY') {
    throw AppError.badRequest('Apenas pedidos prontos podem ser retornados');
  }

  // Reset station completions
  const stations = computeRequiredStations(order.items);
  const completions = initStationCompletions(stations);

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'PREPARING',
      stationCompletions: completions,
      notifiedAt: null,
    },
  });

  publishKDSEvent(unitId, {
    event: 'order.recalled',
    timestamp: new Date().toISOString(),
    data: { orderId, orderNumber: order.orderNumber },
  });

  return {
    orderId,
    orderNumber: order.orderNumber,
    status: 'PREPARING',
    message: `Pedido #${order.orderNumber ?? ''} retornado para preparo.`,
  };
}

// ── Mark Courtesy ───────────────────────────────────────────────────

export async function markCourtesy(
  prisma: PrismaClient,
  orderId: string,
  unitId: string,
  employeeId: string,
  input: CourtesyInput,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      check: { select: { unitId: true } },
      items: true,
    },
  });

  if (!order) throw AppError.notFound('Pedido não encontrado');
  if (order.check.unitId !== unitId) throw AppError.forbidden();

  // Calculate order total
  const total = order.items.reduce(
    (sum, item) => sum + Number(item.totalPrice),
    0,
  );

  // Require authorizedBy if >R$50
  if (total > 50 && !input.authorizedBy) {
    throw AppError.forbidden('Cortesia acima de R$50 requer autorização de gerente');
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        isCortesia: true,
        cortesiaReason: input.reason,
        cortesiaAuthorizedBy: input.authorizedBy ?? employeeId,
      },
    });

    await tx.auditLog.create({
      data: {
        unitId,
        employeeId,
        action: 'ORDER_COURTESY',
        entity: 'Order',
        entityId: orderId,
        after: {
          reason: input.reason,
          authorizedBy: input.authorizedBy ?? employeeId,
          total,
        },
      },
    });
  });

  return {
    orderId,
    isCortesia: true,
    reason: input.reason,
    message: `Pedido #${order.orderNumber ?? ''} marcado como cortesia.`,
  };
}

// ── Mark Staff Meal ─────────────────────────────────────────────────

export async function markStaffMeal(
  prisma: PrismaClient,
  orderId: string,
  unitId: string,
  employeeId: string,
  input: StaffMealInput,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { check: { select: { unitId: true } } },
  });

  if (!order) throw AppError.notFound('Pedido não encontrado');
  if (order.check.unitId !== unitId) throw AppError.forbidden();

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        isCortesia: true,
        cortesiaReason: 'Consumo interno de funcionário',
        staffMealEmployeeId: input.employeeId,
      },
    });

    await tx.auditLog.create({
      data: {
        unitId,
        employeeId,
        action: 'ORDER_STAFF_MEAL',
        entity: 'Order',
        entityId: orderId,
        after: { staffEmployeeId: input.employeeId },
      },
    });
  });

  return {
    orderId,
    isStaffMeal: true,
    staffEmployeeId: input.employeeId,
    message: `Pedido #${order.orderNumber ?? ''} marcado como consumo interno.`,
  };
}

// ── Pickup Board ────────────────────────────────────────────────────

export async function getPickupBoard(
  prisma: PrismaClient,
  slug: string,
  limit: number,
) {
  const unit = await prisma.unit.findFirst({
    where: { slug },
    select: { id: true, name: true },
  });

  if (!unit) throw AppError.notFound('Unidade não encontrada');

  const readyOrders = await prisma.order.findMany({
    where: {
      check: { unitId: unit.id },
      status: 'READY',
      orderNumber: { not: null },
    },
    include: {
      items: {
        include: { product: { select: { name: true } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });

  const preparingOrders = await prisma.order.findMany({
    where: {
      check: { unitId: unit.id },
      status: 'PREPARING',
      orderNumber: { not: null },
    },
    include: {
      items: {
        include: { product: { select: { preparationTime: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: 5,
  });

  return {
    unitName: unit.name,
    ready: readyOrders.map((order) => ({
      orderNumber: order.orderNumber,
      readyAt: order.notifiedAt?.toISOString() ?? order.updatedAt.toISOString(),
      elapsedSinceReady: order.notifiedAt
        ? Math.floor((Date.now() - order.notifiedAt.getTime()) / 1000)
        : 0,
      items: order.items.map((i) => `${i.quantity}x ${i.product.name}`),
    })),
    preparing: preparingOrders.map((order) => {
      const maxPrepTime = Math.max(
        ...order.items.map((i) => i.product.preparationTime ?? 5),
      );
      return {
        orderNumber: order.orderNumber,
        estimatedMinutes: maxPrepTime,
      };
    }),
    lastUpdated: new Date().toISOString(),
  };
}

// ── Stats ───────────────────────────────────────────────────────────

export async function getStats(prisma: PrismaClient, unitId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [allOrders, completedOrders, cancelledOrders, courtesyOrders, staffMeals, currentQueue, currentHeld] =
    await Promise.all([
      prisma.order.count({
        where: { check: { unitId }, createdAt: { gte: todayStart } },
      }),
      prisma.order.count({
        where: { check: { unitId }, status: { in: ['READY', 'DELIVERED'] }, createdAt: { gte: todayStart } },
      }),
      prisma.order.count({
        where: { check: { unitId }, status: 'CANCELLED', createdAt: { gte: todayStart } },
      }),
      prisma.order.count({
        where: { check: { unitId }, isCortesia: true, staffMealEmployeeId: null, createdAt: { gte: todayStart } },
      }),
      prisma.order.count({
        where: { check: { unitId }, staffMealEmployeeId: { not: null }, createdAt: { gte: todayStart } },
      }),
      prisma.order.count({
        where: { check: { unitId }, status: { in: ['PENDING', 'PREPARING'] } },
      }),
      prisma.order.count({
        where: { check: { unitId }, status: 'HELD' },
      }),
    ]);

  const avgPrepSeconds = await getAvgPrepTime(prisma, unitId);

  // By-station breakdown: count items per station today
  const stationOrders = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      order: { check: { unitId }, createdAt: { gte: todayStart } },
    },
    _sum: { quantity: true },
  });

  const stationProductIds = stationOrders.map((s) => s.productId);
  const stationProducts = stationProductIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: stationProductIds } },
        select: { id: true, station: true, name: true },
      })
    : [];

  const productLookup = new Map(stationProducts.map((p) => [p.id, p]));

  const byStation: Record<string, { orderItems: number; totalQuantity: number }> = {};
  for (const row of stationOrders) {
    const product = productLookup.get(row.productId);
    const station = product?.station ?? 'OTHER';
    const existing = byStation[station];
    if (!existing) {
      byStation[station] = { orderItems: 1, totalQuantity: row._sum.quantity ?? 0 };
    } else {
      existing.orderItems += 1;
      existing.totalQuantity += row._sum.quantity ?? 0;
    }
  }

  // Top products: most ordered items today
  const topProductsRaw = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      order: { check: { unitId }, createdAt: { gte: todayStart } },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 10,
  });

  const topProductIds = topProductsRaw.map((t) => t.productId);
  const topProductDetails = topProductIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: topProductIds } },
        select: { id: true, name: true, station: true },
      })
    : [];

  const topProductNameMap = new Map(topProductDetails.map((p) => [p.id, p]));
  const topProducts = topProductsRaw.map((row) => {
    const product = topProductNameMap.get(row.productId);
    return {
      productId: row.productId,
      productName: product?.name ?? 'Desconhecido',
      station: product?.station ?? null,
      totalQuantity: row._sum.quantity ?? 0,
    };
  });

  return {
    period: 'today',
    overall: {
      totalOrders: allOrders,
      completedOrders,
      cancelledOrders,
      courtesyOrders,
      staffMeals,
      avgPrepTimeSeconds: avgPrepSeconds,
      currentQueueLength: currentQueue,
      currentHeldOrders: currentHeld,
    },
    byStation,
    topProducts,
  };
}

// ── Average Prep Time Helper ────────────────────────────────────────

async function getAvgPrepTime(prisma: PrismaClient, unitId: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const result = await prisma.order.findMany({
    where: {
      check: { unitId },
      status: { in: ['READY', 'DELIVERED'] },
      notifiedAt: { not: null },
      createdAt: { gte: todayStart },
    },
    select: { createdAt: true, notifiedAt: true },
    take: 100,
    orderBy: { createdAt: 'desc' },
  });

  if (result.length === 0) return 0;

  const totalSeconds = result.reduce((sum, order) => {
    if (!order.notifiedAt) return sum;
    return sum + (order.notifiedAt.getTime() - order.createdAt.getTime()) / 1000;
  }, 0);

  return Math.round(totalSeconds / result.length);
}
