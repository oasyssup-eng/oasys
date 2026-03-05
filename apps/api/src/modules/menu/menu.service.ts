import type { PrismaClient, OrderStatus } from '@oasys/database';
import type {
  MenuCategoryWithProductsDTO,
  MenuProductDTO,
  MenuProductDetailDTO,
  MenuOrderResponseDTO,
  MenuOrderItemDTO,
  MenuOrderDetailDTO,
  MenuSearchResultDTO,
  MenuCheckSummaryDTO,
} from '@oasys/shared';
import { AppError } from '../../lib/errors';
import { resolvePricesBatch, resolvePrice } from './price.service';
import type { SessionData } from './session.service';
import { publishOrderEvent } from './ws.handler';
import { publishKDSEvent } from '../kds/ws.handler';
import { getCoursesToHold } from '../kds/course-sequencer';

// ── Get Categories ──────────────────────────────────────────────────

export async function getCategories(
  prisma: PrismaClient,
  unitId: string,
): Promise<Array<{ id: string; name: string; sortOrder: number; productCount: number }>> {
  const categories = await prisma.category.findMany({
    where: { unitId, isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { products: { where: { isAvailable: true } } } },
    },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sortOrder,
    productCount: c._count.products,
  }));
}

// ── Get Products (grouped by category) ──────────────────────────────

export async function getProducts(
  prisma: PrismaClient,
  unitId: string,
  filters?: { category?: string; search?: string; tags?: string },
): Promise<MenuCategoryWithProductsDTO[]> {
  // Build product where clause
  const productWhere: Record<string, unknown> = {
    unitId,
    isAvailable: true,
  };

  if (filters?.category) {
    productWhere.categoryId = filters.category;
  }

  if (filters?.search) {
    productWhere.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  // Fetch categories with products
  const categories = await prisma.category.findMany({
    where: {
      unitId,
      isActive: true,
      ...(filters?.category ? { id: filters.category } : {}),
    },
    orderBy: { sortOrder: 'asc' },
    include: {
      products: {
        where: productWhere,
        orderBy: { sortOrder: 'asc' },
        include: {
          modifierGroups: { select: { id: true } },
        },
      },
    },
  });

  // Collect all products for batch price resolution
  const allProducts = categories.flatMap((c) => c.products);
  const priceMap = await resolvePricesBatch(prisma, allProducts, unitId);

  // Filter by tags if specified
  const tagFilters = filters?.tags?.split(',').map((t) => t.trim().toLowerCase()) ?? [];

  const result: MenuCategoryWithProductsDTO[] = [];

  for (const cat of categories) {
    let products = cat.products;

    // Apply tag filter
    if (tagFilters.length > 0) {
      products = products.filter((p) => {
        if (!p.tags) return false;
        try {
          const productTags: string[] = JSON.parse(p.tags);
          return tagFilters.some((tf) =>
            productTags.some((pt) => pt.toLowerCase().includes(tf)),
          );
        } catch {
          return false;
        }
      });
    }

    if (products.length === 0) continue;

    const menuProducts: MenuProductDTO[] = products.map((p) => {
      const priceInfo = priceMap.get(p.id);
      let tags: string[] = [];
      try {
        if (p.tags) tags = JSON.parse(p.tags);
      } catch { /* empty */ }

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        basePrice: priceInfo?.basePrice ?? Number(p.price),
        effectivePrice: priceInfo?.effectivePrice ?? Number(p.price),
        priceLabel: priceInfo?.priceLabel ?? null,
        imageUrl: p.imageUrl,
        isAvailable: p.isAvailable,
        preparationTime: p.preparationTime,
        station: p.station,
        tags,
        sortOrder: p.sortOrder,
        hasModifiers: p.modifierGroups.length > 0,
      };
    });

    result.push({
      id: cat.id,
      name: cat.name,
      sortOrder: cat.sortOrder,
      products: menuProducts,
    });
  }

  return result;
}

// ── Get Product Detail ──────────────────────────────────────────────

export async function getProductDetail(
  prisma: PrismaClient,
  productId: string,
  unitId: string,
): Promise<MenuProductDetailDTO> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      modifierGroups: {
        orderBy: { sortOrder: 'asc' },
        include: {
          modifiers: {
            where: { isAvailable: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });

  if (!product) {
    throw AppError.notFound('Produto não encontrado');
  }

  if (product.unitId !== unitId) {
    throw AppError.notFound('Produto não encontrado');
  }

  const priceInfo = await resolvePrice(
    prisma,
    product.id,
    unitId,
    Number(product.price),
  );

  let tags: string[] = [];
  try {
    if (product.tags) tags = JSON.parse(product.tags);
  } catch { /* empty */ }

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    basePrice: priceInfo.basePrice,
    effectivePrice: priceInfo.effectivePrice,
    priceLabel: priceInfo.priceLabel,
    imageUrl: product.imageUrl,
    isAvailable: product.isAvailable,
    preparationTime: product.preparationTime,
    station: product.station,
    tags,
    modifierGroups: product.modifierGroups.map((mg) => ({
      id: mg.id,
      name: mg.name,
      required: mg.min > 0,
      min: mg.min,
      max: mg.max,
      sortOrder: mg.sortOrder,
      modifiers: mg.modifiers.map((m) => ({
        id: m.id,
        name: m.name,
        price: Number(m.price),
        isAvailable: m.isAvailable,
        sortOrder: m.sortOrder,
      })),
    })),
  };
}

// ── Search Products ─────────────────────────────────────────────────

export async function searchProducts(
  prisma: PrismaClient,
  unitId: string,
  query: string,
  limit: number,
): Promise<{ results: MenuSearchResultDTO[]; totalCount: number }> {
  const where = {
    unitId,
    isAvailable: true,
    OR: [
      { name: { contains: query, mode: 'insensitive' as const } },
      { description: { contains: query, mode: 'insensitive' as const } },
    ],
  };

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        category: { select: { name: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  // Batch resolve prices
  const priceMap = await resolvePricesBatch(prisma, products, unitId);

  const results: MenuSearchResultDTO[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    categoryName: p.category.name,
    price: priceMap.get(p.id)?.effectivePrice ?? Number(p.price),
    imageUrl: p.imageUrl,
  }));

  return { results, totalCount };
}

// ── Course Type Helpers ──────────────────────────────────────────────

const STATION_TO_COURSE: Record<string, string> = {
  BAR: 'DRINK',
  KITCHEN: 'MAIN',
  GRILL: 'MAIN',
  DESSERT: 'DESSERT',
};

const COURSE_PRIORITY: Record<string, number> = {
  DRINK: 0,
  STARTER: 1,
  MAIN: 2,
  DESSERT: 3,
};

/**
 * Infer the dominant courseType from product stations.
 * Returns the highest-level course present (DESSERT > MAIN > STARTER > DRINK).
 */
function inferCourseType(
  products: Array<{ station: string | null }>,
): string | null {
  let highest: string | null = null;
  let highestPriority = -1;

  for (const p of products) {
    if (!p.station) continue;
    const course = STATION_TO_COURSE[p.station];
    if (!course) continue;
    const priority = COURSE_PRIORITY[course] ?? -1;
    if (priority > highestPriority) {
      highestPriority = priority;
      highest = course;
    }
  }

  return highest;
}

// ── Create Order ────────────────────────────────────────────────────

export async function createMenuOrder(
  prisma: PrismaClient,
  session: SessionData,
  items: Array<{
    productId: string;
    quantity: number;
    notes?: string;
    modifiers?: Array<{ modifierId: string; quantity: number }>;
  }>,
): Promise<MenuOrderResponseDTO> {
  const unitId = session.unitId;
  const checkId = session.checkId;

  // 1. Fetch all products
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, unitId },
    include: {
      modifierGroups: {
        include: { modifiers: true },
      },
    },
  });

  // Validate all products exist and are available
  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw AppError.badRequest(`Produto ${item.productId} não encontrado`);
    }
    if (!product.isAvailable) {
      throw AppError.badRequest(`Produto "${product.name}" está indisponível`);
    }
  }

  // 2. Validate modifiers for each item
  for (const item of items) {
    const product = productMap.get(item.productId)!;
    validateModifiers(product, item.modifiers ?? []);
  }

  // 3. Resolve prices
  const priceMap = await resolvePricesBatch(prisma, products, unitId);

  // 4. Determine order status based on OrderPolicy
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { orderPolicy: true },
  });

  const orderPolicy = unit?.orderPolicy ?? 'POST_PAYMENT';
  let orderStatus: OrderStatus;
  let paymentRequired = false;

  if (orderPolicy === 'PRE_PAYMENT') {
    orderStatus = 'HELD';
    paymentRequired = true;
  } else if (orderPolicy === 'HYBRID') {
    if (session.type === 'COUNTER') {
      orderStatus = 'HELD';
      paymentRequired = true;
    } else {
      orderStatus = 'PENDING';
    }
  } else {
    // POST_PAYMENT
    orderStatus = 'PENDING';
  }

  // 4b. Course sequencing — auto-hold if prerequisite course not yet ready
  const orderProducts = items.map((item) => productMap.get(item.productId)!);
  const courseType = inferCourseType(orderProducts);

  if (orderStatus === 'PENDING' && courseType) {
    const existingOrders = await prisma.order.findMany({
      where: { checkId, courseType: { not: null } },
      select: { courseType: true, status: true },
    });

    const allCourseTypes = [
      ...existingOrders.map((o) => o.courseType),
      courseType,
    ];
    const toHold = getCoursesToHold(allCourseTypes);

    if (toHold.has(courseType)) {
      // Only hold if prerequisite course has NOT completed yet
      const prereqReady = existingOrders.some((o) => {
        if (courseType === 'MAIN') {
          return o.courseType === 'STARTER' && (o.status === 'READY' || o.status === 'DELIVERED');
        }
        if (courseType === 'DESSERT') {
          return o.courseType === 'MAIN' && (o.status === 'READY' || o.status === 'DELIVERED');
        }
        return false;
      });

      if (!prereqReady) {
        orderStatus = 'HELD';
      }
    }
  }

  // 5. Generate order number (sequential per unit per day)
  const orderNumber = await generateOrderNumber(prisma, unitId);

  // 6. Create Order + OrderItems in transaction
  const { orderId, total, responseItems } = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        checkId,
        status: orderStatus,
        courseType,
        orderNumber,
        source: 'WEB_MENU',
        items: {
          create: items.map((item) => {
            const product = productMap.get(item.productId)!;
            const priceInfo = priceMap.get(item.productId);
            const effectivePrice = priceInfo?.effectivePrice ?? Number(product.price);

            // Calculate modifier total
            let modifierTotal = 0;
            const modifierDetails: MenuOrderItemDTO['modifiers'] = [];

            if (item.modifiers) {
              for (const mod of item.modifiers) {
                const modifier = findModifier(product, mod.modifierId);
                if (modifier) {
                  modifierTotal += Number(modifier.price) * mod.quantity;
                  modifierDetails.push({
                    modifierId: modifier.id,
                    name: modifier.name,
                    price: Number(modifier.price),
                    quantity: mod.quantity,
                  });
                }
              }
            }

            const totalPrice = (effectivePrice + modifierTotal) * item.quantity;

            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: effectivePrice + modifierTotal,
              totalPrice,
              notes: item.notes ?? null,
              modifiers: modifierDetails.length > 0 ? modifierDetails : undefined,
            };
          }),
        },
      },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    // Calculate total and build response inside transaction where types are inferred
    const orderTotal = newOrder.items.reduce((sum: number, i) => sum + Number(i.totalPrice), 0);

    const mappedItems: MenuOrderItemDTO[] = newOrder.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
      notes: i.notes,
      modifiers: (i.modifiers as MenuOrderItemDTO['modifiers']) ?? [],
    }));

    return { orderId: newOrder.id, total: orderTotal, responseItems: mappedItems };
  });

  const message = paymentRequired
    ? `Pedido #${orderNumber} montado! Realize o pagamento para enviar.`
    : `Pedido #${orderNumber} recebido! Acompanhe o status.`;

  // Publish WebSocket event for non-HELD orders
  if (!paymentRequired) {
    publishOrderEvent(orderId, {
      event: 'order.received',
      orderId,
      orderNumber,
      timestamp: new Date().toISOString(),
      data: {},
    });

    // Notify KDS operators about new order
    publishKDSEvent(unitId, {
      event: 'order.new',
      timestamp: new Date().toISOString(),
      data: { orderId, orderNumber, source: 'WEB_MENU' },
    });
  }

  return {
    orderId,
    orderNumber,
    status: orderStatus as MenuOrderResponseDTO['status'],
    checkId,
    items: responseItems,
    total,
    paymentRequired,
    paymentOptions: paymentRequired ? { pix: true, card: true } : null,
    message,
  };
}

// ── Get Order ───────────────────────────────────────────────────────

export async function getOrder(
  prisma: PrismaClient,
  orderId: string,
  checkId: string,
): Promise<MenuOrderDetailDTO> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { name: true } },
        },
      },
    },
  });

  if (!order) {
    throw AppError.notFound('Pedido não encontrado');
  }

  if (order.checkId !== checkId) {
    throw AppError.notFound('Pedido não encontrado');
  }

  const total = order.items.reduce((sum, i) => sum + Number(i.totalPrice), 0);

  return {
    id: order.id,
    status: order.status as MenuOrderDetailDTO['status'],
    orderNumber: order.orderNumber,
    items: order.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
      notes: i.notes,
      modifiers: (i.modifiers as MenuOrderItemDTO['modifiers']) ?? [],
    })),
    total,
    createdAt: order.createdAt.toISOString(),
  };
}

// ── Get My Orders ───────────────────────────────────────────────────

export async function getMyOrders(
  prisma: PrismaClient,
  checkId: string,
): Promise<MenuOrderDetailDTO[]> {
  const orders = await prisma.order.findMany({
    where: { checkId },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          product: { select: { name: true } },
        },
      },
    },
  });

  return orders.map((order) => {
    const total = order.items.reduce((sum, i) => sum + Number(i.totalPrice), 0);

    return {
      id: order.id,
      status: order.status as MenuOrderDetailDTO['status'],
      orderNumber: order.orderNumber,
      items: order.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.product.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
        notes: i.notes,
        modifiers: (i.modifiers as MenuOrderItemDTO['modifiers']) ?? [],
      })),
      total,
      createdAt: order.createdAt.toISOString(),
    };
  });
}

// ── Get Check Summary ───────────────────────────────────────────────

export async function getCheckSummary(
  prisma: PrismaClient,
  checkId: string,
  unitId: string,
): Promise<MenuCheckSummaryDTO> {
  const check = await prisma.check.findUnique({
    where: { id: checkId },
    include: {
      table: { select: { number: true } },
      orders: {
        include: {
          items: {
            include: {
              product: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!check) {
    throw AppError.notFound('Conta não encontrada');
  }

  if (check.unitId !== unitId) {
    throw AppError.forbidden('Conta não pertence a esta unidade');
  }

  // Calculate totals
  const itemsTotal = check.orders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + Number(i.totalPrice), 0),
    0,
  );

  const serviceFeeAmount = Number(check.serviceFeeAmount ?? 0);
  const tipAmount = Number(check.tipAmount ?? 0);
  const discountAmount = Number(check.discountAmount ?? 0);
  const grossTotal = itemsTotal + serviceFeeAmount + tipAmount - discountAmount;

  const totalPaid = check.payments
    .filter((p) => p.status === 'CONFIRMED')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    id: check.id,
    status: check.status,
    tableId: check.tableId,
    tableNumber: check.table?.number ?? null,
    totalAmount: grossTotal,
    serviceFeeAmount,
    tipAmount: tipAmount || null,
    discountAmount: discountAmount || null,
    orders: check.orders.map((o) => ({
      id: o.id,
      status: o.status,
      orderNumber: o.orderNumber,
      items: o.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.product.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
        notes: i.notes,
        modifiers: (i.modifiers as MenuOrderItemDTO['modifiers']) ?? [],
      })),
    })),
    payments: check.payments.map((p) => ({
      id: p.id,
      method: p.method,
      amount: Number(p.amount),
      status: p.status,
    })),
    itemsTotal,
    grossTotal,
    totalPaid,
    remainingBalance: Math.max(0, grossTotal - totalPaid),
  };
}

// ── Initiate Payment (PRE_PAYMENT flow) ─────────────────────────────

export async function initiateOrderPayment(
  prisma: PrismaClient,
  orderId: string,
  checkId: string,
  unitId: string,
  input: {
    method: 'PIX' | 'CARD';
    customerName?: string;
    customerCpf?: string;
    customerEmail?: string;
  },
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });

  if (!order) {
    throw AppError.notFound('Pedido não encontrado');
  }

  if (order.checkId !== checkId) {
    throw AppError.notFound('Pedido não encontrado');
  }

  if (order.status !== 'HELD') {
    throw AppError.badRequest('Pedido não requer pagamento antecipado');
  }

  // Calculate order total
  const orderTotal = order.items.reduce(
    (sum, i) => sum + Number(i.totalPrice),
    0,
  );

  // Delegate to payment service (imported dynamically to avoid circular deps)
  // The payment will be created against the check, not directly against the order
  // When payment is confirmed via webhook, the order should transition HELD → PENDING
  return {
    orderId: order.id,
    orderTotal,
    method: input.method,
    checkId,
    unitId,
    // The route handler will call the payment service directly
  };
}

// ── Private Helpers ─────────────────────────────────────────────────

function validateModifiers(
  product: {
    modifierGroups: Array<{
      id: string;
      name: string;
      min: number;
      max: number;
      modifiers: Array<{ id: string; isAvailable: boolean }>;
    }>;
  },
  modifiers: Array<{ modifierId: string; quantity: number }>,
): void {
  // Group selected modifiers by their group
  const modifierToGroup = new Map<string, string>();
  const groupModifierCount = new Map<string, number>();

  for (const mg of product.modifierGroups) {
    for (const m of mg.modifiers) {
      modifierToGroup.set(m.id, mg.id);
    }
    groupModifierCount.set(mg.id, 0);
  }

  // Validate each modifier exists and belongs to this product
  for (const mod of modifiers) {
    const groupId = modifierToGroup.get(mod.modifierId);
    if (!groupId) {
      throw AppError.badRequest(
        `Modificador ${mod.modifierId} não pertence a este produto`,
      );
    }

    // Check modifier is available
    const group = product.modifierGroups.find((g) => g.id === groupId);
    const modifier = group?.modifiers.find((m) => m.id === mod.modifierId);
    if (!modifier?.isAvailable) {
      throw AppError.badRequest(
        `Modificador ${mod.modifierId} está indisponível`,
      );
    }

    groupModifierCount.set(
      groupId,
      (groupModifierCount.get(groupId) ?? 0) + mod.quantity,
    );
  }

  // Validate min/max per group
  for (const mg of product.modifierGroups) {
    const count = groupModifierCount.get(mg.id) ?? 0;

    if (count < mg.min) {
      throw AppError.badRequest(
        `Grupo "${mg.name}" requer no mínimo ${mg.min} seleção(ões)`,
      );
    }

    if (count > mg.max) {
      throw AppError.badRequest(
        `Grupo "${mg.name}" permite no máximo ${mg.max} seleção(ões)`,
      );
    }
  }
}

function findModifier(
  product: {
    modifierGroups: Array<{
      modifiers: Array<{ id: string; name: string; price: unknown }>;
    }>;
  },
  modifierId: string,
) {
  for (const mg of product.modifierGroups) {
    for (const m of mg.modifiers) {
      if (m.id === modifierId) return m;
    }
  }
  return null;
}

async function generateOrderNumber(
  prisma: PrismaClient,
  unitId: string,
): Promise<number> {
  // Get the start of today in UTC (good enough for sequential numbering)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastOrder = await prisma.order.findFirst({
    where: {
      check: { unitId },
      createdAt: { gte: today },
      orderNumber: { not: null },
    },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });

  return (lastOrder?.orderNumber ?? 0) + 1;
}
