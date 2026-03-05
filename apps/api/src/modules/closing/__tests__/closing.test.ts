import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { createMockPrisma, createSampleChecks, createSamplePayments } from './closing.mock';
import { preflight, executeClosing, reopenClosing } from '../closing.service';
import { generateClosingCSV } from '../export-csv';
import { calculateComparison } from '../comparison';

let mockPrisma: ReturnType<typeof createMockPrisma>;

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma = createMockPrisma();
});

// ── preflight ────────────────────────────────────────────────────────

describe('preflight', () => {
  it('returns BLOCKER when cash register is open', async () => {
    mockPrisma.cashRegister.count.mockResolvedValue(1);
    mockPrisma.dailyReport.findUnique.mockResolvedValue(null);
    mockPrisma.check.count.mockResolvedValue(0);
    mockPrisma.payment.count.mockResolvedValue(0);
    mockPrisma.fiscalNote.count.mockResolvedValue(0);

    const result = await preflight(
      mockPrisma as unknown as PrismaClient,
      'unit_001',
      '2026-03-05',
    );

    expect(result.canClose).toBe(false);
    expect(result.blockers).toHaveLength(1);
    expect(result.blockers[0]!.type).toBe('OPEN_CASH_REGISTERS');
  });

  it('returns WARNING for open checks, canClose=true', async () => {
    mockPrisma.cashRegister.count.mockResolvedValue(0);
    mockPrisma.dailyReport.findUnique.mockResolvedValue(null);
    // Open checks
    mockPrisma.check.count
      .mockResolvedValueOnce(3) // open checks
      .mockResolvedValueOnce(10) // total checks
      .mockResolvedValueOnce(8); // paid checks
    mockPrisma.payment.count.mockResolvedValue(0);
    mockPrisma.fiscalNote.count.mockResolvedValue(0);

    const result = await preflight(
      mockPrisma as unknown as PrismaClient,
      'unit_001',
      '2026-03-05',
    );

    expect(result.canClose).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.type).toBe('OPEN_CHECKS');
  });

  it('returns clean result when no blockers or warnings', async () => {
    mockPrisma.cashRegister.count.mockResolvedValue(0);
    mockPrisma.dailyReport.findUnique.mockResolvedValue(null);
    mockPrisma.check.count.mockResolvedValue(0);
    mockPrisma.payment.count.mockResolvedValue(0);
    mockPrisma.fiscalNote.count.mockResolvedValue(0);

    const result = await preflight(
      mockPrisma as unknown as PrismaClient,
      'unit_001',
      '2026-03-05',
    );

    expect(result.canClose).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});

// ── executeClosing ───────────────────────────────────────────────────

describe('executeClosing', () => {
  it('creates DailyReport with correct consolidation', async () => {
    // Setup: no blockers
    mockPrisma.cashRegister.count.mockResolvedValue(0);
    mockPrisma.dailyReport.findUnique.mockResolvedValue(null);
    mockPrisma.check.count.mockResolvedValue(0);
    mockPrisma.payment.count.mockResolvedValue(0);
    mockPrisma.fiscalNote.count.mockResolvedValue(0);

    // Data loading
    mockPrisma.check.findMany.mockResolvedValue([]);
    mockPrisma.payment.findMany.mockResolvedValue([]);
    mockPrisma.cashRegister.findMany.mockResolvedValue([]);
    mockPrisma.fiscalNote.findMany.mockResolvedValue([]);

    const result = await executeClosing(
      mockPrisma as unknown as PrismaClient,
      'unit_001',
      { date: '2026-03-05', acknowledgeWarnings: false },
      'emp_001',
    );

    expect(result.report).toBeDefined();
    expect(result.revenue).toBeDefined();
    expect(result.operations).toBeDefined();
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('throws conflict when day already closed', async () => {
    mockPrisma.cashRegister.count.mockResolvedValue(0);
    mockPrisma.dailyReport.findUnique.mockResolvedValue({
      id: 'report_001',
      status: 'CLOSED',
    });
    mockPrisma.check.count.mockResolvedValue(0);
    mockPrisma.payment.count.mockResolvedValue(0);
    mockPrisma.fiscalNote.count.mockResolvedValue(0);

    await expect(
      executeClosing(
        mockPrisma as unknown as PrismaClient,
        'unit_001',
        { date: '2026-03-05', acknowledgeWarnings: false },
        'emp_001',
      ),
    ).rejects.toThrow('Este dia já foi fechado');
  });

  it('throws error for future date', async () => {
    await expect(
      executeClosing(
        mockPrisma as unknown as PrismaClient,
        'unit_001',
        { date: '2099-12-31', acknowledgeWarnings: false },
        'emp_001',
      ),
    ).rejects.toThrow('Não é possível fechar um dia futuro');
  });

  it('throws when warnings not acknowledged', async () => {
    // Warnings present (open checks)
    mockPrisma.cashRegister.count.mockResolvedValue(0);
    mockPrisma.dailyReport.findUnique.mockResolvedValue(null);
    mockPrisma.check.count
      .mockResolvedValueOnce(2) // open checks
      .mockResolvedValueOnce(5) // total
      .mockResolvedValueOnce(3); // paid
    mockPrisma.payment.count.mockResolvedValue(0);
    mockPrisma.fiscalNote.count.mockResolvedValue(0);

    await expect(
      executeClosing(
        mockPrisma as unknown as PrismaClient,
        'unit_001',
        { date: '2026-03-05', acknowledgeWarnings: false },
        'emp_001',
      ),
    ).rejects.toThrow('Existem avisos pendentes');
  });
});

// ── reopenClosing ────────────────────────────────────────────────────

describe('reopenClosing', () => {
  it('reopens successfully with audit log', async () => {
    mockPrisma.dailyReport.findFirst.mockResolvedValue({
      id: 'report_001',
      unitId: 'unit_001',
      reopenCount: 0,
    });
    mockPrisma.dailyReport.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});
    mockPrisma.hourlyRevenue.deleteMany.mockResolvedValue({});

    const result = await reopenClosing(
      mockPrisma as unknown as PrismaClient,
      'report_001',
      'unit_001',
      'Erro na contagem do caixa, preciso corrigir',
      'emp_owner',
    );

    expect(result.success).toBe(true);
    expect(mockPrisma.dailyReport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REOPENED',
          reopenCount: { increment: 1 },
        }),
      }),
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    expect(mockPrisma.hourlyRevenue.deleteMany).toHaveBeenCalled();
  });

  it('throws 429 when max reopens exceeded', async () => {
    mockPrisma.dailyReport.findFirst.mockResolvedValue({
      id: 'report_001',
      unitId: 'unit_001',
      reopenCount: 3,
    });

    await expect(
      reopenClosing(
        mockPrisma as unknown as PrismaClient,
        'report_001',
        'unit_001',
        'Preciso reabrir novamente',
        'emp_owner',
      ),
    ).rejects.toThrow('Limite de 3 reaberturas');
  });

  it('throws not found for missing report', async () => {
    mockPrisma.dailyReport.findFirst.mockResolvedValue(null);

    await expect(
      reopenClosing(
        mockPrisma as unknown as PrismaClient,
        'report_999',
        'unit_001',
        'Preciso reabrir este fechamento',
        'emp_owner',
      ),
    ).rejects.toThrow('Fechamento nao encontrado');
  });
});

// ── CSV Export ────────────────────────────────────────────────────────

describe('generateClosingCSV', () => {
  it('produces UTF-8 BOM and PT-BR formatting', () => {
    const csv = generateClosingCSV(
      {
        date: '2026-03-05',
        revenue: {
          grossRevenue: 1500,
          serviceFees: 150,
          tips: 75,
          discounts: 50,
          cancellationAmount: 100,
          courtesyAmount: 30,
          staffMealAmount: 20,
          netRevenue: 1350,
        },
        paymentSummary: {
          totalConfirmed: 1575,
          totalRefunded: 0,
          pendingCount: 0,
          pendingAmount: 0,
          byMethod: { PIX: 800, CASH: 500, CREDIT_CARD: 275 },
        },
        hourlyData: [
          { hour: 20, revenue: 500, orderCount: 10, checkCount: 5 },
          { hour: 21, revenue: 800, orderCount: 15, checkCount: 8 },
        ],
        divergences: [],
      },
      'Bar do Zé',
    );

    // UTF-8 BOM
    expect(csv.charCodeAt(0)).toBe(0xfeff);

    // Check PT-BR currency formatting (comma as decimal separator)
    expect(csv).toContain('1500,00');
    expect(csv).toContain('1350,00');

    // Check sections
    expect(csv).toContain('RESUMO FINANCEIRO');
    expect(csv).toContain('PAGAMENTOS');
    expect(csv).toContain('FATURAMENTO POR HORA');
    expect(csv).toContain('SEM DIVERGÊNCIAS');
  });
});

// ── Comparison ───────────────────────────────────────────────────────

describe('calculateComparison', () => {
  it('returns null when no previous report exists', async () => {
    mockPrisma.dailyReport.findUnique.mockResolvedValue(null);

    const result = await calculateComparison(
      mockPrisma as unknown as PrismaClient,
      'unit_001',
      '2026-03-05',
      1000,
      10,
    );

    expect(result).toBeNull();
  });

  it('returns correct percentage changes', async () => {
    mockPrisma.dailyReport.findUnique.mockResolvedValue({
      netRevenue: 800,
      totalRevenue: null,
      paidChecks: 8,
      totalChecks: null,
    });

    const result = await calculateComparison(
      mockPrisma as unknown as PrismaClient,
      'unit_001',
      '2026-03-05',
      1000,
      10,
    );

    expect(result).not.toBeNull();
    expect(result!.revenueChange).toBe(25); // (1000-800)/800 * 100 = 25%
    expect(result!.checksChange).toBe(25); // (10-8)/8 * 100 = 25%
    expect(result!.previousRevenue).toBe(800);
    expect(result!.currentRevenue).toBe(1000);
  });
});
