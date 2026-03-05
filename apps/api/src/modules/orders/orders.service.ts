import type { PrismaClient } from '@oasys/database';
import { AppError } from '../../lib/errors';
import type { DeliverOrderInput, PartialDeliverInput } from './orders.schemas';

// ── Deliver Order (Full) ────────────────────────────────────────────
export async function deliverOrder(
  prisma: PrismaClient,
  orderId: string,
  unitId: string,
  employeeId: string,
  input: DeliverOrderInput,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      check: { select: { unitId: true } },
      items: true,
    },
  });

  if (!order) throw AppError.notFound('Pedido não encontrado');
  if (order.check.unitId !== unitId) throw AppError.forbidden('Pedido não pertence a esta unidade');
  if (order.status !== 'READY') {
    throw AppError.badRequest('Pedido não está pronto para entrega');
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Mark order as delivered
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: now,
        deliveredBy: employeeId,
      },
    });

    // Mark all items as delivered
    await tx.orderItem.updateMany({
      where: { orderId },
      data: { isDelivered: true, deliveredAt: now },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        unitId,
        employeeId,
        action: 'ORDER_DELIVERED',
        entity: 'Order',
        entityId: orderId,
        after: { notes: input.notes ?? null },
      },
    });
  });

  return {
    orderId,
    status: 'DELIVERED',
    deliveredAt: now.toISOString(),
    deliveredBy: employeeId,
    message: `Pedido #${order.orderNumber ?? orderId.slice(-4)} marcado como entregue.`,
  };
}

// ── Deliver Order (Partial) ─────────────────────────────────────────
export async function deliverPartial(
  prisma: PrismaClient,
  orderId: string,
  unitId: string,
  employeeId: string,
  input: PartialDeliverInput,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      check: { select: { unitId: true } },
      items: true,
    },
  });

  if (!order) throw AppError.notFound('Pedido não encontrado');
  if (order.check.unitId !== unitId) throw AppError.forbidden('Pedido não pertence a esta unidade');
  if (order.status !== 'READY') {
    throw AppError.badRequest('Pedido não está pronto para entrega');
  }

  const now = new Date();

  // Validate item IDs belong to this order
  const orderItemIds = new Set(order.items.map((i) => i.id));
  for (const itemId of input.deliveredItemIds) {
    if (!orderItemIds.has(itemId)) {
      throw AppError.badRequest(`Item ${itemId} não pertence a este pedido`);
    }
  }

  await prisma.$transaction(async (tx) => {
    // Mark specified items as delivered
    await tx.orderItem.updateMany({
      where: { id: { in: input.deliveredItemIds } },
      data: { isDelivered: true, deliveredAt: now },
    });

    // Check if ALL items are now delivered
    const undeliveredCount = await tx.orderItem.count({
      where: { orderId, isDelivered: false },
    });

    if (undeliveredCount === 0) {
      // All items delivered — transition order to DELIVERED
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'DELIVERED',
          deliveredAt: now,
          deliveredBy: employeeId,
        },
      });
    }
  });

  const remainingCount = order.items.length - input.deliveredItemIds.length;
  const allDelivered = order.items.filter((i) => !input.deliveredItemIds.includes(i.id))
    .every((i) => i.isDelivered);
  const finalAllDelivered = allDelivered && remainingCount === 0;

  return {
    orderId,
    deliveredItems: input.deliveredItemIds.length,
    remainingItems: order.items.filter((i) => !i.isDelivered && !input.deliveredItemIds.includes(i.id)).length,
    orderStatus: finalAllDelivered ? 'DELIVERED' : 'READY',
    message: `${input.deliveredItemIds.length} item(s) entregue(s).`,
  };
}
