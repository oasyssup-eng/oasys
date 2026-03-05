import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as service from '../payments.service';

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

  // ── createCashPayment ─────────────────────────────────────────────

  describe('createCashPayment', () => {
    it('should create a CONFIRMED cash payment and calculate change', async () => {
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

    it('should default change to 0 when receivedAmount is not provided', async () => {
      const check = mockCheckData();
      (prisma.check.findUnique as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(check)
        .mockResolvedValueOnce(check);

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
        { checkId: CHECK_ID, amount: 100 },
        EMPLOYEE_ID,
        UNIT_ID,
      );

      expect(result.change).toBe(0);
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

    it('should throw 400 when check is CANCELLED', async () => {
      const check = mockCheckData({ status: 'CANCELLED' });
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(check);

      await expect(
        service.createCashPayment(
          prisma,
          { checkId: CHECK_ID, amount: 50 },
          EMPLOYEE_ID,
          UNIT_ID,
        ),
      ).rejects.toThrow('Conta foi cancelada');
    });

    it('should throw 403 when check belongs to different unit', async () => {
      const check = mockCheckData({ unitId: 'other_unit' });
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(check);

      await expect(
        service.createCashPayment(
          prisma,
          { checkId: CHECK_ID, amount: 50 },
          EMPLOYEE_ID,
          UNIT_ID,
        ),
      ).rejects.toThrow('Conta não pertence a esta unidade');
    });
  });

  // ── createCardPresentPayment ──────────────────────────────────────

  describe('createCardPresentPayment', () => {
    it('should create a CONFIRMED credit card payment', async () => {
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
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ method: 'CREDIT_CARD' }),
        }),
      );
    });

    it('should create a DEBIT_CARD payment when isDebit is true', async () => {
      const check = mockCheckData();
      (prisma.check.findUnique as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(check)
        .mockResolvedValueOnce(check);

      (prisma.payment.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'pay_003',
        checkId: CHECK_ID,
        method: 'DEBIT_CARD',
        amount: 60,
        status: 'CONFIRMED',
        paidAt: new Date(),
      });

      await service.createCardPresentPayment(
        prisma,
        { checkId: CHECK_ID, amount: 60, isDebit: true },
        EMPLOYEE_ID,
        UNIT_ID,
      );

      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ method: 'DEBIT_CARD' }),
        }),
      );
    });
  });

  // ── checkPaymentCompletion ────────────────────────────────────────

  describe('checkPaymentCompletion', () => {
    it('should auto-close check when fully paid', async () => {
      const check = mockCheckData({
        payments: [{ amount: 143, status: 'CONFIRMED' }],
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
        payments: [{ amount: 100, status: 'CONFIRMED' }],
      });
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(check);

      const result = await service.checkPaymentCompletion(prisma, CHECK_ID);

      expect(result.isPaid).toBe(false);
      expect(result.remainingBalance).toBeGreaterThan(0);
      expect(prisma.check.update).not.toHaveBeenCalled();
    });

    it('should auto-close when multiple partial payments cover total', async () => {
      // grossTotal = 143. Two payments summing to 143.
      const check = mockCheckData({
        payments: [
          { amount: 100, status: 'CONFIRMED' },
          { amount: 43, status: 'CONFIRMED' },
        ],
      });
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(check);
      (prisma.check.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...check,
        status: 'PAID',
      });

      const result = await service.checkPaymentCompletion(prisma, CHECK_ID);

      expect(result.isPaid).toBe(true);
      expect(prisma.check.update).toHaveBeenCalledOnce();
    });

    it('should handle R$0.01 tolerance for floating-point rounding', async () => {
      // grossTotal = 143, totalPaid = 142.995 (within tolerance)
      const check = mockCheckData({
        payments: [{ amount: 142.995, status: 'CONFIRMED' }],
      });
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(check);
      (prisma.check.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...check,
        status: 'PAID',
      });

      const result = await service.checkPaymentCompletion(prisma, CHECK_ID);

      expect(result.isPaid).toBe(true);
    });

    it('should return isPaid false when check does not exist', async () => {
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.checkPaymentCompletion(prisma, 'missing');

      expect(result.isPaid).toBe(false);
    });

    it('should use explicit serviceFeeAmount when set on check', async () => {
      // serviceFeeAmount = 20 (explicit), not auto-calculated from rate
      // itemsTotal = 130, gross = 130 + 20 = 150
      const check = mockCheckData({
        serviceFeeAmount: 20,
        payments: [{ amount: 150, status: 'CONFIRMED' }],
      });
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(check);
      (prisma.check.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...check,
        status: 'PAID',
      });

      const result = await service.checkPaymentCompletion(prisma, CHECK_ID);

      expect(result.isPaid).toBe(true);
    });

    it('should include tip and discount in gross total', async () => {
      // items=130, serviceFee=13, tip=10, discount=3 → gross = 130+13+10-3 = 150
      const check = mockCheckData({
        tipAmount: 10,
        discountAmount: 3,
        payments: [{ amount: 150, status: 'CONFIRMED' }],
      });
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(check);
      (prisma.check.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...check,
        status: 'PAID',
      });

      const result = await service.checkPaymentCompletion(prisma, CHECK_ID);

      expect(result.isPaid).toBe(true);
    });
  });

  // ── getPaymentsByCheck ────────────────────────────────────────────

  describe('getPaymentsByCheck', () => {
    it('should return payments list for a valid check', async () => {
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        unitId: UNIT_ID,
      });
      const payments = [{ id: 'pay_1' }, { id: 'pay_2' }];
      (prisma.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(payments);

      const result = await service.getPaymentsByCheck(prisma, CHECK_ID, UNIT_ID);

      expect(result).toHaveLength(2);
    });

    it('should throw 404 when check not found', async () => {
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.getPaymentsByCheck(prisma, 'missing', UNIT_ID),
      ).rejects.toThrow('Conta não encontrada');
    });

    it('should throw 403 when check belongs to different unit', async () => {
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        unitId: 'other_unit',
      });

      await expect(
        service.getPaymentsByCheck(prisma, CHECK_ID, UNIT_ID),
      ).rejects.toThrow('Conta não pertence a esta unidade');
    });
  });

  // ── getPaymentById ────────────────────────────────────────────────

  describe('getPaymentById', () => {
    it('should return payment detail', async () => {
      (prisma.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'pay_001',
        method: 'CASH',
        check: { unitId: UNIT_ID },
      });

      const result = await service.getPaymentById(prisma, 'pay_001', UNIT_ID);

      expect(result.id).toBe('pay_001');
    });

    it('should throw 404 when payment not found', async () => {
      (prisma.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.getPaymentById(prisma, 'missing', UNIT_ID),
      ).rejects.toThrow('Pagamento não encontrado');
    });

    it('should throw 403 when payment belongs to different unit', async () => {
      (prisma.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'pay_001',
        check: { unitId: 'other_unit' },
      });

      await expect(
        service.getPaymentById(prisma, 'pay_001', UNIT_ID),
      ).rejects.toThrow('Pagamento não pertence a esta unidade');
    });
  });

  // ── getPaymentSummary ─────────────────────────────────────────────

  describe('getPaymentSummary', () => {
    it('should return full financial breakdown', async () => {
      const check = mockCheckData({
        payments: [
          { id: 'p1', method: 'CASH', amount: 100, status: 'CONFIRMED', createdAt: new Date() },
          { id: 'p2', method: 'PIX', amount: 43, status: 'CONFIRMED', createdAt: new Date() },
        ],
      });
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(check);

      const result = await service.getPaymentSummary(prisma, CHECK_ID, UNIT_ID);

      expect(result.checkTotal).toBe(130);       // items total
      expect(result.serviceFeeAmount).toBe(13);   // 10% service fee
      expect(result.grossTotal).toBe(143);
      expect(result.totalPaid).toBe(143);
      expect(result.remainingBalance).toBe(0);
      expect(result.isPaid).toBe(true);
      expect(result.breakdown.CASH).toBe(100);
      expect(result.breakdown.PIX).toBe(43);
    });

    it('should calculate remaining balance when partially paid', async () => {
      const check = mockCheckData({
        payments: [
          { id: 'p1', method: 'CASH', amount: 50, status: 'CONFIRMED', createdAt: new Date() },
          { id: 'p2', method: 'PIX', amount: 20, status: 'PENDING', createdAt: new Date() },
        ],
      });
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(check);

      const result = await service.getPaymentSummary(prisma, CHECK_ID, UNIT_ID);

      // Only CONFIRMED payments count: 50
      expect(result.totalPaid).toBe(50);
      expect(result.remainingBalance).toBe(93); // 143 - 50
      expect(result.isPaid).toBe(false);
      // All payments returned (including PENDING)
      expect(result.payments).toHaveLength(2);
    });

    it('should throw 404 when check not found', async () => {
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.getPaymentSummary(prisma, 'missing', UNIT_ID),
      ).rejects.toThrow('Conta não encontrada');
    });
  });

  // ── refundPayment ─────────────────────────────────────────────────

  describe('refundPayment', () => {
    it('should refund a CONFIRMED payment', async () => {
      (prisma.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'pay_001',
        status: 'CONFIRMED',
        checkId: CHECK_ID,
        amount: 50,
        check: { unitId: UNIT_ID, id: CHECK_ID },
      });
      (prisma.payment.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'pay_001',
        status: 'REFUNDED',
        amount: 50,
      });
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CHECK_ID,
        status: 'OPEN',
      });

      const result = await service.refundPayment(prisma, 'pay_001', UNIT_ID);

      expect(result.status).toBe('REFUNDED');
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'REFUNDED' },
        }),
      );
    });

    it('should re-open a PAID check after refund', async () => {
      (prisma.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'pay_001',
        status: 'CONFIRMED',
        checkId: CHECK_ID,
        amount: 143,
        check: { unitId: UNIT_ID, id: CHECK_ID },
      });
      (prisma.payment.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'pay_001',
        status: 'REFUNDED',
        amount: 143,
      });
      (prisma.check.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CHECK_ID,
        status: 'PAID',
      });
      (prisma.check.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: CHECK_ID,
        status: 'OPEN',
      });

      await service.refundPayment(prisma, 'pay_001', UNIT_ID);

      expect(prisma.check.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'OPEN', closedAt: null }),
        }),
      );
    });

    it('should throw 404 when payment not found', async () => {
      (prisma.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.refundPayment(prisma, 'missing', UNIT_ID),
      ).rejects.toThrow('Pagamento não encontrado');
    });

    it('should throw 400 when payment is not CONFIRMED', async () => {
      (prisma.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'pay_001',
        status: 'PENDING',
        checkId: CHECK_ID,
        check: { unitId: UNIT_ID, id: CHECK_ID },
      });

      await expect(
        service.refundPayment(prisma, 'pay_001', UNIT_ID),
      ).rejects.toThrow('Apenas pagamentos confirmados podem ser estornados');
    });

    it('should throw 403 when payment belongs to different unit', async () => {
      (prisma.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'pay_001',
        status: 'CONFIRMED',
        checkId: CHECK_ID,
        check: { unitId: 'other_unit', id: CHECK_ID },
      });

      await expect(
        service.refundPayment(prisma, 'pay_001', UNIT_ID),
      ).rejects.toThrow('Pagamento não pertence a esta unidade');
    });
  });
});
