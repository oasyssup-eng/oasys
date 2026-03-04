import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as service from '../payments.service';
import { AppError } from '../../../lib/errors';

// Mock PrismaClient
function createMockPrisma() {
  return {
    check: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    cashRegister: {
      findFirst: vi.fn(),
    },
  } as unknown as Parameters<typeof service.createCashPayment>[0];
}

const UNIT_ID = 'unit_test_001';
const EMPLOYEE_ID = 'emp_test_001';
const CHECK_ID = 'check_test_001';
const CASH_REGISTER_ID = 'cr_test_001';

function mockCheckData(overrides = {}) {
  return {
    id: CHECK_ID,
    unitId: UNIT_ID,
    status: 'OPEN',
    serviceFeeAmount: null,
    tipAmount: null,
    discountAmount: null,
    orders: [
      {
        items: [
          { unitPrice: 50, quantity: 2 },
          { unitPrice: 30, quantity: 1 },
        ],
      },
    ],
    payments: [],
    unit: { serviceFeeRate: '0.1000' },
    ...overrides,
  };
}

describe('Payment Service', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    vi.clearAllMocks();
  });

  describe('createCashPayment', () => {
    it('should create a CONFIRMED cash payment and calculate change', async () => {
      // Check total: (50*2 + 30) = 130, + 10% service = 143
      const check = mockCheckData();
      (prisma.check.findUnique as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(check)   // validateCheck
        .mockResolvedValueOnce(check);  // checkPaymentCompletion

      (prisma.cashRegister.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CASH_REGISTER_ID,
        status: 'OPEN',
      });

      (prisma.payment.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'pay_001',
        checkId: CHECK_ID,
        method: 'CASH',
        amount: 100,
        status: 'CONFIRMED',
        paidAt: new Date(),
        cashRegisterId: CASH_REGISTER_ID,
      });

      const result = await service.createCashPayment(
        prisma,
        { checkId: CHECK_ID, amount: 100, receivedAmount: 150 },
        EMPLOYEE_ID,
        UNIT_ID,
      );

      expect(result.status).toBe('CONFIRMED');
      expect(result.change).toBe(50);
      expect(prisma.payment.create).toHaveBeenCalledOnce();
    });

    it('should throw 400 when no cash register is open', async () => {
      const check = mockCheckData();
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(check);
      (prisma.cashRegister.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.createCashPayment(
          prisma,
          { checkId: CHECK_ID, amount: 50 },
          EMPLOYEE_ID,
          UNIT_ID,
        ),
      ).rejects.toThrow('Nenhum caixa aberto');
    });

    it('should throw 400 when amount exceeds remaining balance', async () => {
      const check = mockCheckData({
        payments: [{ amount: 140, status: 'CONFIRMED' }],
      });
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(check);

      // grossTotal = 130 + 13 (10%) = 143, totalPaid = 140, remaining = 3
      await expect(
        service.createCashPayment(
          prisma,
          { checkId: CHECK_ID, amount: 50 },
          EMPLOYEE_ID,
          UNIT_ID,
        ),
      ).rejects.toThrow('Valor excede saldo restante');
    });

    it('should throw 404 when check does not exist', async () => {
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.createCashPayment(
          prisma,
          { checkId: 'nonexistent', amount: 50 },
          EMPLOYEE_ID,
          UNIT_ID,
        ),
      ).rejects.toThrow('Conta não encontrada');
    });

    it('should throw 400 when check is already PAID', async () => {
      const check = mockCheckData({ status: 'PAID' });
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(check);

      await expect(
        service.createCashPayment(
          prisma,
          { checkId: CHECK_ID, amount: 50 },
          EMPLOYEE_ID,
          UNIT_ID,
        ),
      ).rejects.toThrow('Conta já foi paga');
    });
  });

  describe('createCardPresentPayment', () => {
    it('should create a CONFIRMED card-present payment', async () => {
      const check = mockCheckData();
      (prisma.check.findUnique as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(check)
        .mockResolvedValueOnce(check);

      (prisma.payment.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'pay_002',
        checkId: CHECK_ID,
        method: 'CREDIT_CARD',
        amount: 80,
        status: 'CONFIRMED',
        paidAt: new Date(),
      });

      const result = await service.createCardPresentPayment(
        prisma,
        {
          checkId: CHECK_ID,
          amount: 80,
          cardBrand: 'VISA',
          lastFourDigits: '1234',
          isDebit: false,
        },
        EMPLOYEE_ID,
        UNIT_ID,
      );

      expect(result.status).toBe('CONFIRMED');
    });
  });

  describe('checkPaymentCompletion', () => {
    it('should auto-close check when fully paid', async () => {
      const check = mockCheckData({
        payments: [
          { amount: 143, status: 'CONFIRMED' },
        ],
      });
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(check);
      (prisma.check.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...check,
        status: 'PAID',
      });

      const result = await service.checkPaymentCompletion(prisma, CHECK_ID);

      expect(result.isPaid).toBe(true);
      expect(result.remainingBalance).toBe(0);
      expect(prisma.check.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PAID' }),
        }),
      );
    });

    it('should NOT close check when partially paid', async () => {
      const check = mockCheckData({
        payments: [
          { amount: 100, status: 'CONFIRMED' },
        ],
      });
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(check);

      const result = await service.checkPaymentCompletion(prisma, CHECK_ID);

      expect(result.isPaid).toBe(false);
      expect(result.remainingBalance).toBeGreaterThan(0);
      expect(prisma.check.update).not.toHaveBeenCalled();
    });
  });
});
