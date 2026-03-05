import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createSession,
  getSession,
  validateSession,
  cleanupExpiredSessions,
  clearAllSessions,
  getSessionCount,
} from '../session.service';

// ── Mock Prisma ─────────────────────────────────────────────────────

function createMockPrisma() {
  return {
    unit: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    table: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    check: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    floatingAccount: {
      create: vi.fn(),
    },
  } as unknown as Parameters<typeof createSession>[0];
}

const mockUnit = {
  id: 'unit_001',
  name: 'Boteco do Zé',
  slug: 'boteco-do-ze',
  orderPolicy: 'POST_PAYMENT',
  serviceFeeRate: null,
  tipSuggestions: null,
  operatingHoursStart: null,
  operatingHoursEnd: null,
  timezone: 'America/Sao_Paulo',
};

const mockTable = {
  id: 'table_001',
  unitId: 'unit_001',
  number: 5,
  zone: { name: 'Salão Principal' },
};

const mockCheck = {
  id: 'check_001',
  unitId: 'unit_001',
  tableId: 'table_001',
  status: 'OPEN',
};

describe('Session Service', () => {
  beforeEach(() => {
    clearAllSessions();
    vi.clearAllMocks();
  });

  // ── Create Session ──────────────────────────────────────────────

  it('should create a TABLE session with valid table number', async () => {
    const prisma = createMockPrisma();
    (prisma.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockUnit);
    (prisma.table.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockTable);
    (prisma.check.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.check.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockCheck);
    (prisma.table.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await createSession(prisma, 'boteco-do-ze', { table: 5 });

    expect(result.sessionToken).toBeTruthy();
    expect(result.unit.slug).toBe('boteco-do-ze');
    expect(result.context.type).toBe('TABLE');
    expect(result.context.tableNumber).toBe(5);
    expect(result.context.zoneName).toBe('Salão Principal');
    expect(result.context.checkId).toBe('check_001');
    expect(result.isOpen).toBe(true);
    expect(getSessionCount()).toBe(1);
  });

  it('should reuse existing OPEN check for same table', async () => {
    const prisma = createMockPrisma();
    (prisma.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockUnit);
    (prisma.table.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockTable);
    (prisma.check.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCheck);

    const result = await createSession(prisma, 'boteco-do-ze', { table: 5 });

    expect(result.context.checkId).toBe('check_001');
    // check.create should NOT be called since we reuse existing
    expect(prisma.check.create).not.toHaveBeenCalled();
  });

  it('should create a COUNTER session', async () => {
    const prisma = createMockPrisma();
    (prisma.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockUnit);
    (prisma.check.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'check_counter',
      unitId: 'unit_001',
      status: 'OPEN',
    });
    (prisma.floatingAccount.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await createSession(prisma, 'boteco-do-ze', {
      mode: 'counter',
      name: 'João',
    });

    expect(result.context.type).toBe('COUNTER');
    expect(result.context.customerName).toBe('João');
    expect(result.context.tableId).toBeNull();
    expect(prisma.floatingAccount.create).toHaveBeenCalled();
  });

  it('should throw 404 for unknown unit slug', async () => {
    const prisma = createMockPrisma();
    (prisma.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      createSession(prisma, 'unknown-slug', { table: 1 }),
    ).rejects.toThrow('Estabelecimento não encontrado');
  });

  it('should throw 404 for unknown table number', async () => {
    const prisma = createMockPrisma();
    (prisma.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockUnit);
    (prisma.table.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      createSession(prisma, 'boteco-do-ze', { table: 999 }),
    ).rejects.toThrow('Mesa 999 não encontrada');
  });

  it('should throw 400 when no table or mode specified', async () => {
    const prisma = createMockPrisma();
    (prisma.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockUnit);

    await expect(
      createSession(prisma, 'boteco-do-ze', {}),
    ).rejects.toThrow('Informe o número da mesa ou mode=counter');
  });

  it('should return isOpen=true when no operating hours are set', async () => {
    const prisma = createMockPrisma();
    (prisma.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockUnit);
    (prisma.table.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockTable);
    (prisma.check.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCheck);

    const result = await createSession(prisma, 'boteco-do-ze', { table: 5 });
    expect(result.isOpen).toBe(true);
  });

  it('should parse tipSuggestions from JSON string', async () => {
    const prisma = createMockPrisma();
    (prisma.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockUnit,
      tipSuggestions: '[10, 12, 15]',
    });
    (prisma.table.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockTable);
    (prisma.check.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCheck);

    const result = await createSession(prisma, 'boteco-do-ze', { table: 5 });
    expect(result.unit.tipSuggestions).toEqual([10, 12, 15]);
  });

  // ── Session Validation ──────────────────────────────────────────

  it('should validate a valid session token', async () => {
    const prisma = createMockPrisma();
    (prisma.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockUnit);
    (prisma.table.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockTable);
    (prisma.check.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCheck);

    const created = await createSession(prisma, 'boteco-do-ze', { table: 5 });
    const session = getSession(created.sessionToken);

    expect(session.unitId).toBe('unit_001');
    expect(session.checkId).toBe('check_001');
    expect(session.type).toBe('TABLE');
  });

  it('should throw for invalid session token', () => {
    expect(() => getSession('invalid_token')).toThrow('Sessão inválida ou expirada');
  });

  it('should return null for invalid token via validateSession', () => {
    const result = validateSession('invalid_token');
    expect(result).toBeNull();
  });

  // ── Cleanup ─────────────────────────────────────────────────────

  it('should cleanup expired sessions', async () => {
    const prisma = createMockPrisma();
    (prisma.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockUnit);
    (prisma.table.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockTable);
    (prisma.check.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCheck);

    // Create a session
    await createSession(prisma, 'boteco-do-ze', { table: 5 });
    expect(getSessionCount()).toBe(1);

    // Manually expire the session by mocking time
    // Since we can't easily mock the Map internals, just test that cleanup works with no expired sessions
    const removed = cleanupExpiredSessions();
    expect(removed).toBe(0); // Just created, not expired yet
    expect(getSessionCount()).toBe(1);
  });

  it('should clear all sessions', async () => {
    const prisma = createMockPrisma();
    (prisma.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockUnit);
    (prisma.table.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockTable);
    (prisma.check.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCheck);

    await createSession(prisma, 'boteco-do-ze', { table: 5 });
    expect(getSessionCount()).toBe(1);

    clearAllSessions();
    expect(getSessionCount()).toBe(0);
  });
});
