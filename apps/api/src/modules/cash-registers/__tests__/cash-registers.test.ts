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

  // ── openCashRegister ──────────────────────────────────────────────

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

    it('should throw 409 when DIGITAL register already open for unit', async () => {
      (prisma.cashRegister.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'digital_cr',
        type: 'DIGITAL',
        status: 'OPEN',
      });

      await expect(
        service.openCashRegister(
          prisma,
          { openingBalance: 0, type: 'DIGITAL' },
          EMPLOYEE_ID,
          UNIT_ID,
        ),
      ).rejects.toThrow('Já existe um caixa digital aberto para esta unidade');
    });

    it('should set employeeId to null for DIGITAL type', async () => {
      (prisma.cashRegister.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.cashRegister.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'digital_cr',
        type: 'DIGITAL',
        status: 'OPEN',
        employeeId: null,
      });

      await service.openCashRegister(
        prisma,
        { openingBalance: 0, type: 'DIGITAL' },
        EMPLOYEE_ID,
        UNIT_ID,
      );

      expect(prisma.cashRegister.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ employeeId: null }),
        }),
      );
    });
  });

  // ── getActiveCashRegister ─────────────────────────────────────────

  describe('getActiveCashRegister', () => {
    it('should return operator register when available', async () => {
      const operatorReg = { id: CR_ID, type: 'OPERATOR', operations: [] };
      (prisma.cashRegister.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(operatorReg);

      const result = await service.getActiveCashRegister(prisma, EMPLOYEE_ID, UNIT_ID);

      expect(result?.id).toBe(CR_ID);
    });

    it('should fall back to digital register when no operator register', async () => {
      const digitalReg = { id: 'digital_cr', type: 'DIGITAL', operations: [] };
      (prisma.cashRegister.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)       // no operator
        .mockResolvedValueOnce(digitalReg); // digital fallback

      const result = await service.getActiveCashRegister(prisma, EMPLOYEE_ID, UNIT_ID);

      expect(result?.id).toBe('digital_cr');
    });

    it('should return null when no register is open', async () => {
      (prisma.cashRegister.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.getActiveCashRegister(prisma, EMPLOYEE_ID, UNIT_ID);

      expect(result).toBeNull();
    });
  });

  // ── createOperation ───────────────────────────────────────────────

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

    it('should create a SUPPLY operation', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        unitId: UNIT_ID,
        status: 'OPEN',
      });
      (prisma.cashRegisterOperation.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'op_002',
        type: 'SUPPLY',
        amount: 300,
        reason: 'Suprimento de troco',
      });

      const result = await service.createOperation(
        prisma,
        CR_ID,
        { type: 'SUPPLY', amount: 300, reason: 'Suprimento de troco' },
        EMPLOYEE_ID,
        UNIT_ID,
      );

      expect(result.type).toBe('SUPPLY');
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
        id: 'op_003',
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

    it('should allow withdrawal <= R$200 without authorization', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        unitId: UNIT_ID,
        status: 'OPEN',
      });
      (prisma.cashRegisterOperation.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'op_004',
        type: 'WITHDRAWAL',
        amount: 200,
      });

      const result = await service.createOperation(
        prisma,
        CR_ID,
        { type: 'WITHDRAWAL', amount: 200, reason: 'Sangria regular' },
        EMPLOYEE_ID,
        UNIT_ID,
      );

      expect(result.amount).toBe(200);
    });

    it('should throw 404 when cash register not found', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.createOperation(
          prisma,
          'missing',
          { type: 'WITHDRAWAL', amount: 50, reason: 'test' },
          EMPLOYEE_ID,
          UNIT_ID,
        ),
      ).rejects.toThrow('Caixa não encontrado');
    });

    it('should throw 403 when register belongs to different unit', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        unitId: 'other_unit',
        status: 'OPEN',
      });

      await expect(
        service.createOperation(
          prisma,
          CR_ID,
          { type: 'WITHDRAWAL', amount: 50, reason: 'test' },
          EMPLOYEE_ID,
          UNIT_ID,
        ),
      ).rejects.toThrow('Caixa não pertence a esta unidade');
    });

    it('should throw 400 when register is CLOSED', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        unitId: UNIT_ID,
        status: 'CLOSED',
      });

      await expect(
        service.createOperation(
          prisma,
          CR_ID,
          { type: 'SUPPLY', amount: 100, reason: 'test' },
          EMPLOYEE_ID,
          UNIT_ID,
        ),
      ).rejects.toThrow('Caixa não está aberto');
    });
  });

  // ── closeCashRegister ─────────────────────────────────────────────

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
      expect(prisma.alert.create).not.toHaveBeenCalled(); // diff < 50
    });

    it('should create HIGH alert when difference exceeds R$50', async () => {
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

    it('should NOT create alert when difference is within R$50', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        unitId: UNIT_ID,
        status: 'OPEN',
        openingBalance: 200,
        operations: [],
        payments: [
          { amount: 100, status: 'CONFIRMED', method: 'CASH' },
        ],
      });

      (prisma.payment.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      // expected = 300, closing = 290 → diff = -10 (within R$50)
      (prisma.cashRegister.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        status: 'CLOSED',
        difference: -10,
      });

      await service.closeCashRegister(
        prisma,
        CR_ID,
        { closingBalance: 290 },
        UNIT_ID,
      );

      expect(prisma.alert.create).not.toHaveBeenCalled();
    });

    it('should include supply and adjustment in expected balance', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        unitId: UNIT_ID,
        status: 'OPEN',
        openingBalance: 200,
        operations: [
          { type: 'WITHDRAWAL', amount: 100 },
          { type: 'SUPPLY', amount: 50 },
          { type: 'ADJUSTMENT', amount: -10 },
        ],
        payments: [
          { amount: 500, status: 'CONFIRMED', method: 'CASH' },
        ],
      });

      (prisma.payment.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      // expected = 200 + 500 - 100 + 50 + (-10) = 640
      (prisma.cashRegister.update as ReturnType<typeof vi.fn>).mockImplementation(
        (args: { data: { expectedBalance: number } }) => {
          return Promise.resolve({
            id: CR_ID,
            status: 'CLOSED',
            expectedBalance: args.data.expectedBalance,
          });
        },
      );

      const result = await service.closeCashRegister(
        prisma,
        CR_ID,
        { closingBalance: 640 },
        UNIT_ID,
      );

      // Verify the update was called with correct expectedBalance
      expect(prisma.cashRegister.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expectedBalance: 640,
            difference: 0,
          }),
        }),
      );
    });

    it('should warn about pending payments on close', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        unitId: UNIT_ID,
        status: 'OPEN',
        openingBalance: 200,
        operations: [],
        payments: [],
      });

      (prisma.payment.count as ReturnType<typeof vi.fn>).mockResolvedValue(3);

      (prisma.cashRegister.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        status: 'CLOSED',
      });

      const result = await service.closeCashRegister(
        prisma,
        CR_ID,
        { closingBalance: 200 },
        UNIT_ID,
      );

      expect(result.pendingPaymentsWarning).toContain('3 pagamentos pendentes');
    });

    it('should throw 404 when register not found', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.closeCashRegister(prisma, 'missing', { closingBalance: 0 }, UNIT_ID),
      ).rejects.toThrow('Caixa não encontrado');
    });

    it('should throw 400 when register is already CLOSED', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        unitId: UNIT_ID,
        status: 'CLOSED',
      });

      await expect(
        service.closeCashRegister(prisma, CR_ID, { closingBalance: 0 }, UNIT_ID),
      ).rejects.toThrow('Caixa não está aberto');
    });
  });

  // ── getCashRegisterById ───────────────────────────────────────────

  describe('getCashRegisterById', () => {
    it('should return register detail with operations', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        unitId: UNIT_ID,
        operations: [{ id: 'op_1' }],
        payments: [],
        employee: { id: EMPLOYEE_ID, name: 'Test', role: 'CASHIER' },
      });

      const result = await service.getCashRegisterById(prisma, CR_ID, UNIT_ID);

      expect(result.id).toBe(CR_ID);
      expect(result.operations).toHaveLength(1);
    });

    it('should throw 404 when not found', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.getCashRegisterById(prisma, 'missing', UNIT_ID),
      ).rejects.toThrow('Caixa não encontrado');
    });

    it('should throw 403 when belongs to different unit', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        unitId: 'other_unit',
      });

      await expect(
        service.getCashRegisterById(prisma, CR_ID, UNIT_ID),
      ).rejects.toThrow('Caixa não pertence a esta unidade');
    });
  });

  // ── listCashRegisters ─────────────────────────────────────────────

  describe('listCashRegisters', () => {
    it('should return paginated list', async () => {
      (prisma.cashRegister.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'cr_1' },
        { id: 'cr_2' },
      ]);
      (prisma.cashRegister.count as ReturnType<typeof vi.fn>).mockResolvedValue(5);

      const result = await service.listCashRegisters(prisma, UNIT_ID, {
        limit: 2,
        offset: 0,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it('should filter by status', async () => {
      (prisma.cashRegister.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.cashRegister.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      await service.listCashRegisters(prisma, UNIT_ID, {
        status: 'OPEN',
        limit: 20,
        offset: 0,
      });

      expect(prisma.cashRegister.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'OPEN' }),
        }),
      );
    });

    it('should filter by date range', async () => {
      (prisma.cashRegister.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.cashRegister.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      await service.listCashRegisters(prisma, UNIT_ID, {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        limit: 20,
        offset: 0,
      });

      expect(prisma.cashRegister.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            openedAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  // ── getCashRegisterReport ─────────────────────────────────────────

  describe('getCashRegisterReport', () => {
    it('should return report with summary totals', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CR_ID,
        unitId: UNIT_ID,
        openingBalance: 200,
        operations: [
          { type: 'WITHDRAWAL', amount: 100 },
          { type: 'SUPPLY', amount: 50 },
        ],
        payments: [
          { amount: 800, status: 'CONFIRMED', method: 'CASH' },
          { amount: 300, status: 'CONFIRMED', method: 'CASH' },
        ],
        employee: { id: EMPLOYEE_ID, name: 'Test', role: 'CASHIER' },
      });

      const result = await service.getCashRegisterReport(prisma, CR_ID, UNIT_ID);

      expect(result.summary.totalCashIn).toBe(1100);
      expect(result.summary.totalWithdrawals).toBe(100);
      expect(result.summary.totalSupplies).toBe(50);
      expect(result.summary.transactionCount).toBe(2);
    });

    it('should throw 404 when not found', async () => {
      (prisma.cashRegister.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.getCashRegisterReport(prisma, 'missing', UNIT_ID),
      ).rejects.toThrow('Caixa não encontrado');
    });
  });
});
