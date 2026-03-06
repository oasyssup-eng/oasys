import { createId } from '@paralleldrive/cuid2';
import type { PrismaClient } from '@oasys/database';
import type { FastifyInstance } from 'fastify';
import type { MenuSessionDTO, MenuSessionContext, MenuUnitDTO } from '@oasys/shared';
import { AppError } from '../../lib/errors';

// ── Session Data ────────────────────────────────────────────────────

export interface SessionData {
  unitId: string;
  checkId: string;
  tableId: string | null;
  type: 'TABLE' | 'COUNTER';
  customerName: string | null;
  createdAt: Date;
  expiresAt: Date;
}

// ── In-Memory Store ─────────────────────────────────────────────────

const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

const sessions = new Map<string, SessionData>();

// ── Public API ──────────────────────────────────────────────────────

export async function createSession(
  prisma: PrismaClient,
  slug: string,
  params: { table?: number; mode?: string; name?: string },
): Promise<MenuSessionDTO> {
  // Find unit by slug
  const unit = await prisma.unit.findFirst({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      orderPolicy: true,
      serviceFeeRate: true,
      tipSuggestions: true,
      operatingHoursStart: true,
      operatingHoursEnd: true,
      timezone: true,
    },
  });

  if (!unit) {
    throw AppError.notFound('Estabelecimento não encontrado');
  }

  // Check operating hours
  const isOpen = checkOperatingHours(
    unit.operatingHoursStart,
    unit.operatingHoursEnd,
    unit.timezone,
  );

  let context: MenuSessionContext;

  if (params.table !== undefined) {
    // TABLE mode
    context = await createTableSession(prisma, unit.id, params.table);
  } else if (params.mode === 'counter') {
    // COUNTER mode
    context = await createCounterSession(prisma, unit.id, params.name ?? 'Cliente');
  } else {
    throw AppError.badRequest('Informe o número da mesa ou mode=counter');
  }

  // Generate session token and store
  const sessionToken = createId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  const sessionData: SessionData = {
    unitId: unit.id,
    checkId: context.checkId,
    tableId: context.tableId,
    type: context.type,
    customerName: context.customerName,
    createdAt: now,
    expiresAt,
  };

  sessions.set(sessionToken, sessionData);

  // Parse tipSuggestions from JSON string
  let tipSuggestions: number[] | null = null;
  if (unit.tipSuggestions) {
    try {
      tipSuggestions = JSON.parse(unit.tipSuggestions as string);
    } catch {
      tipSuggestions = null;
    }
  }

  const unitDto: MenuUnitDTO = {
    id: unit.id,
    name: unit.name,
    slug: unit.slug,
    orderPolicy: unit.orderPolicy as MenuUnitDTO['orderPolicy'],
    serviceFeeRate: unit.serviceFeeRate ? Number(unit.serviceFeeRate) : null,
    tipSuggestions,
    operatingHoursStart: unit.operatingHoursStart,
    operatingHoursEnd: unit.operatingHoursEnd,
  };

  return {
    sessionToken,
    unit: unitDto,
    context,
    isOpen,
    expiresAt: expiresAt.toISOString(),
  };
}

export function getSession(token: string): SessionData {
  const session = sessions.get(token);

  if (!session) {
    throw AppError.unauthorized('Sessão inválida ou expirada');
  }

  if (new Date() > session.expiresAt) {
    sessions.delete(token);
    throw AppError.unauthorized('Sessão expirada');
  }

  return session;
}

export function validateSession(token: string): SessionData | null {
  const session = sessions.get(token);

  if (!session || new Date() > session.expiresAt) {
    if (session) sessions.delete(token);
    return null;
  }

  return session;
}

/** Remove all expired sessions (called periodically) */
export function cleanupExpiredSessions(): number {
  const now = new Date();
  let removed = 0;

  for (const [token, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(token);
      removed++;
    }
  }

  return removed;
}

/** For testing: clear all sessions */
export function clearAllSessions(): void {
  sessions.clear();
}

/** Get session count (for monitoring/testing) */
export function getSessionCount(): number {
  return sessions.size;
}

// ── Register Cleanup Job ────────────────────────────────────────────

export function registerSessionCleanup(app: FastifyInstance): void {
  const timer = setInterval(() => {
    const removed = cleanupExpiredSessions();
    if (removed > 0) {
      app.log.info(`Cleaned up ${removed} expired menu sessions`);
    }
  }, CLEANUP_INTERVAL_MS);

  app.addHook('onClose', () => {
    clearInterval(timer);
  });
}

// ── Private Helpers ─────────────────────────────────────────────────

async function createTableSession(
  prisma: PrismaClient,
  unitId: string,
  tableNumber: number,
): Promise<MenuSessionContext> {
  const table = await prisma.table.findUnique({
    where: { unitId_number: { unitId, number: tableNumber } },
    include: {
      zone: { select: { name: true } },
    },
  });

  if (!table) {
    throw AppError.notFound(`Mesa ${tableNumber} não encontrada`);
  }

  // Look for an existing OPEN check for this table
  let check = await prisma.check.findFirst({
    where: { tableId: table.id, status: 'OPEN' },
  });

  if (!check) {
    // Create a new check for this table (no employeeId for customer-initiated)
    check = await prisma.check.create({
      data: {
        unitId,
        tableId: table.id,
        employeeId: '', // Customer-initiated, no employee
        status: 'OPEN',
      },
    });

    // Mark table as occupied
    await prisma.table.update({
      where: { id: table.id },
      data: { status: 'OCCUPIED' },
    });
  }

  return {
    type: 'TABLE',
    tableId: table.id,
    tableNumber: table.number,
    zoneName: table.zone?.name ?? null,
    checkId: check.id,
    customerName: null,
  };
}

async function createCounterSession(
  prisma: PrismaClient,
  unitId: string,
  customerName: string,
): Promise<MenuSessionContext> {
  // Create a new check (no table, no employee)
  const check = await prisma.check.create({
    data: {
      unitId,
      employeeId: '', // Customer-initiated
      status: 'OPEN',
    },
  });

  // Generate a 4-char pickup code
  const pickupCode = generatePickupCode();

  // Create FloatingAccount
  await prisma.floatingAccount.create({
    data: {
      checkId: check.id,
      customerName,
      pickupCode,
    },
  });

  return {
    type: 'COUNTER',
    tableId: null,
    tableNumber: null,
    zoneName: null,
    checkId: check.id,
    customerName,
  };
}

function generatePickupCode(): string {
  // Generate a 4-digit random code
  return String(Math.floor(1000 + Math.random() * 9000));
}

function checkOperatingHours(
  start: string | null,
  end: string | null,
  timezone: string,
): boolean {
  if (!start || !end) return true; // No hours set = always open

  const now = new Date();

  // Get current time in the unit's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const currentHour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const currentMinute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  const currentMinutes = currentHour * 60 + currentMinute;

  const startParts = start.split(':').map(Number);
  const endParts = end.split(':').map(Number);
  const startMinutes = (startParts[0] ?? 0) * 60 + (startParts[1] ?? 0);
  const endMinutes = (endParts[0] ?? 0) * 60 + (endParts[1] ?? 0);

  // Handle overnight hours (e.g., 17:00 to 02:00)
  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}
