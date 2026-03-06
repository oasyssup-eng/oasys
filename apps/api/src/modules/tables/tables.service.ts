import type { PrismaClient } from '@oasys/database';
import { AppError } from '../../lib/errors';

export type TableColor = 'GREEN' | 'RED' | 'YELLOW' | 'STAR' | 'GRAY';

interface TableStatusResult {
  id: string;
  number: number;
  seats: number;
  label: string | null;
  zoneId: string | null;
  zoneName: string | null;
  posX: number | null;
  posY: number | null;
  color: TableColor;
  hasServiceRequest: boolean;
  checkId: string | null;
  orderCount: number;
  hasReadyOrders: boolean;
}

// ── Get Table Statuses ──────────────────────────────────────────────
export async function getTableStatuses(
  prisma: PrismaClient,
  unitId: string,
): Promise<TableStatusResult[]> {
  const tables = await prisma.table.findMany({
    where: { unitId },
    include: {
      zone: { select: { name: true } },
      checks: {
        where: { status: 'OPEN' },
        take: 1,
        include: {
          orders: {
            where: { status: { notIn: ['CANCELLED'] } },
            select: { id: true, status: true },
          },
        },
      },
    },
    orderBy: { number: 'asc' },
  });

  return tables.map((table) => {
    const openCheck = table.checks[0] ?? null;
    const orders = openCheck?.orders ?? [];
    const hasReadyOrders = orders.some((o) => o.status === 'READY');

    let color: TableColor;
    if (!table.isActive) {
      color = 'GRAY';
    } else if (table.hasServiceRequest) {
      color = 'STAR';
    } else if (!openCheck) {
      color = 'GREEN';
    } else if (hasReadyOrders) {
      color = 'YELLOW';
    } else {
      color = 'RED';
    }

    return {
      id: table.id,
      number: table.number,
      seats: table.seats,
      label: table.label,
      zoneId: table.zoneId,
      zoneName: table.zone?.name ?? null,
      posX: table.posX,
      posY: table.posY,
      color,
      hasServiceRequest: table.hasServiceRequest,
      checkId: openCheck?.id ?? null,
      orderCount: orders.length,
      hasReadyOrders,
    };
  });
}

// ── Get Table Summary ───────────────────────────────────────────────
export async function getTableSummary(
  prisma: PrismaClient,
  tableId: string,
  unitId: string,
) {
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: {
      zone: { select: { name: true } },
      checks: {
        where: { status: 'OPEN' },
        take: 1,
        include: {
          orders: {
            include: { items: true },
          },
          payments: { where: { status: 'CONFIRMED' } },
          unit: { select: { serviceFeeRate: true } },
        },
      },
    },
  });

  if (!table) throw AppError.notFound('Mesa não encontrada');
  if (table.unitId !== unitId) throw AppError.forbidden('Mesa não pertence a esta unidade');

  const check = table.checks[0] ?? null;
  if (!check) {
    return {
      tableId: table.id,
      tableNumber: table.number,
      zoneName: table.zone?.name ?? null,
      status: 'AVAILABLE',
      checkId: null,
      totalItems: 0,
      totalAmount: 0,
      duration: null,
    };
  }

  const totalItems = check.orders.reduce(
    (sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0),
    0,
  );

  const itemsTotal = check.orders.reduce(
    (sum, order) =>
      sum + order.items.reduce((s, item) => s + Number(item.unitPrice) * item.quantity, 0),
    0,
  );

  const duration = Date.now() - check.openedAt.getTime();
  const hours = Math.floor(duration / 3600000);
  const minutes = Math.floor((duration % 3600000) / 60000);
  const durationStr = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

  return {
    tableId: table.id,
    tableNumber: table.number,
    zoneName: table.zone?.name ?? null,
    status: 'OCCUPIED',
    checkId: check.id,
    totalItems,
    totalAmount: itemsTotal,
    duration: durationStr,
  };
}

// ── Dismiss Service Request ─────────────────────────────────────────
export async function dismissServiceRequest(
  prisma: PrismaClient,
  tableId: string,
  unitId: string,
) {
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    select: { id: true, unitId: true, number: true },
  });

  if (!table) throw AppError.notFound('Mesa não encontrada');
  if (table.unitId !== unitId) throw AppError.forbidden('Mesa não pertence a esta unidade');

  await prisma.table.update({
    where: { id: tableId },
    data: { hasServiceRequest: false },
  });

  return {
    tableId,
    tableNumber: table.number,
    message: 'Solicitação de atendimento dispensada.',
  };
}
