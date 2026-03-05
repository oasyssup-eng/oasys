import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as service from '../auth.service';

function createMockPrisma() {
  return {
    unit: { findFirst: vi.fn() },
    employee: { findUnique: vi.fn() },
  } as unknown as Parameters<typeof service.loginWithPin>[0];
}

function createMockApp() {
  return {
    jwt: { sign: vi.fn().mockReturnValue('mock_jwt_token') },
  } as unknown as Parameters<typeof service.loginWithPin>[1];
}

describe('Auth Service', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let app: ReturnType<typeof createMockApp>;

  beforeEach(() => {
    prisma = createMockPrisma();
    app = createMockApp();
    vi.clearAllMocks();
  });

  it('should login with valid PIN', async () => {
    (prisma.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'unit_1',
      name: 'Test Unit',
    });
    (prisma.employee.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'emp_1',
      name: 'Joao Santos',
      role: 'WAITER',
      unitId: 'unit_1',
      isActive: true,
    });

    const result = await service.loginWithPin(prisma, app, {
      pin: '1111',
      unitSlug: 'pinheiros',
    });

    expect(result.token).toBe('mock_jwt_token');
    expect(result.employee.name).toBe('Joao Santos');
    expect(result.employee.role).toBe('WAITER');
  });

  it('should reject invalid unit slug', async () => {
    (prisma.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      service.loginWithPin(prisma, app, { pin: '1111', unitSlug: 'invalid' }),
    ).rejects.toThrow('Unidade não encontrada');
  });

  it('should reject invalid PIN', async () => {
    (prisma.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'unit_1',
      name: 'Test Unit',
    });
    (prisma.employee.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      service.loginWithPin(prisma, app, { pin: '9999', unitSlug: 'pinheiros' }),
    ).rejects.toThrow('PIN inválido');
  });

  it('should reject inactive employee', async () => {
    (prisma.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'unit_1',
      name: 'Test Unit',
    });
    (prisma.employee.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'emp_1',
      name: 'Inactive',
      role: 'WAITER',
      unitId: 'unit_1',
      isActive: false,
    });

    await expect(
      service.loginWithPin(prisma, app, { pin: '1111', unitSlug: 'pinheiros' }),
    ).rejects.toThrow('Funcionário inativo');
  });
});
