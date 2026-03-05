import type { PrismaClient } from '@oasys/database';
import { AppError } from '../../lib/errors';

// ── List Notifications ──────────────────────────────────────────────
export async function listNotifications(
  prisma: PrismaClient,
  unitId: string,
  employeeId: string,
  page = 1,
  limit = 20,
) {
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: {
        unitId,
        OR: [{ employeeId }, { employeeId: null }], // personal + broadcast
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({
      where: {
        unitId,
        OR: [{ employeeId }, { employeeId: null }],
      },
    }),
  ]);

  const unreadCount = await prisma.notification.count({
    where: {
      unitId,
      OR: [{ employeeId }, { employeeId: null }],
      isRead: false,
    },
  });

  return {
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      metadata: n.metadata,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
    total,
    unreadCount,
    page,
    limit,
  };
}

// ── Mark Notification Read ──────────────────────────────────────────
export async function markRead(
  prisma: PrismaClient,
  notificationId: string,
  unitId: string,
) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, unitId: true },
  });

  if (!notification) throw AppError.notFound('Notificação não encontrada');
  if (notification.unitId !== unitId) {
    throw AppError.forbidden('Notificação não pertence a esta unidade');
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });

  return { id: notificationId, isRead: true };
}

// ── Mark All Read ───────────────────────────────────────────────────
export async function markAllRead(
  prisma: PrismaClient,
  unitId: string,
  employeeId: string,
) {
  const result = await prisma.notification.updateMany({
    where: {
      unitId,
      OR: [{ employeeId }, { employeeId: null }],
      isRead: false,
    },
    data: { isRead: true, readAt: new Date() },
  });

  return { markedRead: result.count };
}

// ── Create Notification (used by other modules) ─────────────────────
export async function createNotification(
  prisma: PrismaClient,
  data: {
    unitId: string;
    employeeId?: string | null;
    type: 'ORDER_READY' | 'ORDER_NEW' | 'TABLE_REQUEST' | 'PAYMENT_CONFIRMED' | 'STOCK_LOW' | 'SYSTEM';
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  },
) {
  return prisma.notification.create({
    data: {
      unitId: data.unitId,
      employeeId: data.employeeId ?? null,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata as Record<string, string | number | boolean> | undefined,
    },
  });
}
