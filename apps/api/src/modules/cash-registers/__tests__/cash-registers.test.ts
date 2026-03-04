import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as service from '../cash-registers.service';

function createMockPrisma() {
  return {
    cashRegister: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    cashRegisterOperation: {
      create: vi.fn(),
    },
    payment: {
      count: vi.fn(),
    },
    alert: {
      create: vi.fn(),
    },
  } as unknown as Parameters<typeof service.openCashRegister>[0];
}

const UNIT_ID = 'unit_test_001';
const EMPLOYEE_ID = 'emp_test_001';
const CR_ID = 'cr_test_001';

describe('CashRegister Service', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    vi.clearAllMocks();
  });

  describe('openCashRegister', () => {
    it('should create an OPEN cash register with opening balance', async () => {
      (prisma.cashRegister.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.cashRegister.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        unitId: UNIT_ID,
        employeeId: EMPLOYEE_ID,
        type: 'OPERATOR',
        status: 'OPEN',
        openingBalance: 200,
      });

      const result = await service.openCashRegister(
        prisma,
        { openingBalance: 200, type: 'OPERATOR' },
        EMPLOYEE_ID,
        UNIT_ID,
      );

      expect(result.status).toBe('OPEN');
      expect(result.openingBalance).toBe(200);
    });

    it('should throw 409 when operator already has an open register', async () => {
      (prisma.cashRegister.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'existing_cr',
        status: 'OPEN',
      });

      await expect(
        service.openCashRegister(
          prisma,
          { openingBalance: 200, type: 'OPERATOR' },
          EMPLOYEE_ID,
          UNIT_ID,
        ),
      ).rejects.toThrow('Você já tem um caixa aberto');
    });
  });

  describe('createOperation', () => {
    it('should create a WITHDRAWAL operation', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        unitId: UNIT_ID,
        status: 'OPEN',
      });
      (prisma.cashRegisterOperation.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'op_001',
        type: 'WITHDRAWAL',
        amount: 100,
        reason: 'Sangria noturna',
      });

      const result = await service.createOperation(
        prisma,
        CR_ID,
        { type: 'WITHDRAWAL', amount: 100, reason: 'Sangria noturna' },
        EMPLOYEE_ID,
        UNIT_ID,
      );

      expect(result.type).toBe('WITHDRAWAL');
    });

    it('should throw 403 for withdrawal > R$200 without authorization', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        unitId: UNIT_ID,
        status: 'OPEN',
      });

      await expect(
        service.createOperation(
          prisma,
          CR_ID,
          { type: 'WITHDRAWAL', amount: 300, reason: 'Sangria grande' },
          EMPLOYEE_ID,
          UNIT_ID,
        ),
      ).rejects.toThrow('Sangria acima de R$200 requer autorização do gerente');
    });

    it('should allow withdrawal > R$200 WITH authorization', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        unitId: UNIT_ID,
        status: 'OPEN',
      });
      (prisma.cashRegisterOperation.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'op_002',
        type: 'WITHDRAWAL',
        amount: 500,
        authorizedBy: 'mgr_001',
      });

      const result = await service.createOperation(
        prisma,
        CR_ID,
        {
          type: 'WITHDRAWAL',
          amount: 500,
          reason: 'Sangria cofre',
          authorizedBy: 'mgr_001',
        },
        EMPLOYEE_ID,
        UNIT_ID,
      );

      expect(result.amount).toBe(500);
    });
  });

  describe('closeCashRegister', () => {
    it('should close register and calculate expected balance + difference', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        unitId: UNIT_ID,
        status: 'OPEN',
        openingBalance: 200,
        operations: [
          { type: 'WITHDRAWAL', amount: 500 },
        ],
        payments: [
          { amount: 2152.50, status: 'CONFIRMED', method: 'CASH' },
        ],
      });

      (prisma.payment.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      // expected = 200 + 2152.50 - 500 = 1852.50
      // closing = 1847.30 → diff = 1847.30 - 1852.50 = -5.20
      (prisma.cashRegister.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        status: 'CLOSED',
        closingBalance: 1847.30,
        expectedBalance: 1852.50,
        difference: -5.20,
      });

      const result = await service.closeCashRegister(
        prisma,
        CR_ID,
        { closingBalance: 1847.30, closingNotes: 'Faltando R$5,20' },
        UNIT_ID,
      );

      expect(result.status).toBe('CLOSED');
      expect(prisma.cashRegister.update).toHaveBeenCalledOnce();
    });

    it('should create alert when difference exceeds R$50', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        unitId: UNIT_ID,
        status: 'OPEN',
        openingBalance: 200,
        operations: [],
        payments: [
          { amount: 1000, status: 'CONFIRMED', method: 'CASH' },
        ],
      });

      (prisma.payment.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      // expected = 200 + 1000 = 1200, closing = 1100 → diff = -100
      (prisma.cashRegister.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        status: 'CLOSED',
        difference: -100,
      });

      await service.closeCashRegister(
        prisma,
        CR_ID,
        { closingBalance: 1100 },
        UNIT_ID,
      );

      expect(prisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            severity: 'CRITICAL',
          }),
        }),
      );
    });
  });
});
