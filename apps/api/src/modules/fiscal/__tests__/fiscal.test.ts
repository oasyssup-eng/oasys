import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrisma, createMockFocusNFeService, createSampleCheck } from './focusnfe.mock';
import * as service from '../fiscal.service';

// Mock the FocusNFe service module
const mockFocusNFe = createMockFocusNFeService();
vi.mock('../focusnfe.service', () => ({
  getFocusNFeService: () => mockFocusNFe,
}));

let mockPrisma: ReturnType<typeof createMockPrisma>;

beforeEach(() => {
  mockPrisma = createMockPrisma();
  vi.clearAllMocks();
});

// ── emitNFCeForCheck ────────────────────────────────────────────────

describe('emitNFCeForCheck', () => {
  it('emits NFC-e for a valid PAID check (PENDING → PROCESSING)', async () => {
    const check = createSampleCheck();
    mockPrisma.check.findUnique.mockResolvedValue(check);
    mockPrisma.fiscalNote.findFirst.mockResolvedValue(null);
    mockPrisma.fiscalNote.create.mockResolvedValue({
      id: 'cltest_note_001',
      externalRef: 'oasys_test_ref',
      status: 'PENDING',
    });
    mockPrisma.fiscalNote.update.mockResolvedValue({
      id: 'cltest_note_001',
      status: 'PROCESSING',
    });

    const result = await service.emitNFCeForCheck(
      mockPrisma as any,
      'cltest_check_001',
    );

    expect(result.skipped).toBe(false);
    expect(result.fiscalNoteId).toBe('cltest_note_001');
    expect(mockPrisma.fiscalNote.create).toHaveBeenCalledOnce();
    expect(mockFocusNFe.emitNFCe).toHaveBeenCalledOnce();
    expect(mockPrisma.fiscalNote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PROCESSING' }),
      }),
    );
  });

  it('skips when fiscal fields are missing and creates alert', async () => {
    const check = createSampleCheck({
      unit: {
        ...createSampleCheck().unit,
        cnpj: null,
        legalName: null,
      },
    });
    mockPrisma.check.findUnique.mockResolvedValue(check);
    mockPrisma.alert.create.mockResolvedValue({});

    const result = await service.emitNFCeForCheck(
      mockPrisma as any,
      'cltest_check_001',
    );

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('cnpj');
    expect(mockPrisma.alert.create).toHaveBeenCalledOnce();
    expect(mockFocusNFe.emitNFCe).not.toHaveBeenCalled();
  });

  it('updates to ERROR when FocusNFe is down', async () => {
    const check = createSampleCheck();
    mockPrisma.check.findUnique.mockResolvedValue(check);
    mockPrisma.fiscalNote.findFirst.mockResolvedValue(null);
    mockPrisma.fiscalNote.create.mockResolvedValue({
      id: 'cltest_note_001',
      externalRef: 'oasys_test_ref',
      status: 'PENDING',
    });
    mockFocusNFe.emitNFCe.mockRejectedValueOnce(
      new Error('Service unavailable'),
    );
    mockPrisma.fiscalNote.update.mockResolvedValue({
      id: 'cltest_note_001',
      status: 'ERROR',
    });

    const result = await service.emitNFCeForCheck(
      mockPrisma as any,
      'cltest_check_001',
    );

    expect(result.fiscalNoteId).toBe('cltest_note_001');
    expect(mockPrisma.fiscalNote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ERROR',
          errorMessage: 'Service unavailable',
        }),
      }),
    );
  });

  it('is idempotent — returns existing note if already emitted', async () => {
    const check = createSampleCheck();
    mockPrisma.check.findUnique.mockResolvedValue(check);
    mockPrisma.fiscalNote.findFirst.mockResolvedValue({
      id: 'cltest_note_existing',
      status: 'PROCESSING',
    });

    const result = await service.emitNFCeForCheck(
      mockPrisma as any,
      'cltest_check_001',
    );

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('Already emitted');
    expect(result.fiscalNoteId).toBe('cltest_note_existing');
    expect(mockFocusNFe.emitNFCe).not.toHaveBeenCalled();
  });

  it('skips when all orders are cortesia', async () => {
    const check = createSampleCheck({
      orders: [
        {
          ...createSampleCheck().orders[0],
          isCortesia: true,
        },
      ],
    });
    mockPrisma.check.findUnique.mockResolvedValue(check);

    const result = await service.emitNFCeForCheck(
      mockPrisma as any,
      'cltest_check_001',
    );

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('cortesia');
  });

  it('returns skipped when check not found', async () => {
    mockPrisma.check.findUnique.mockResolvedValue(null);

    const result = await service.emitNFCeForCheck(
      mockPrisma as any,
      'nonexistent',
    );

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('Check not found');
  });
});

// ── cancelFiscalNote ────────────────────────────────────────────────

describe('cancelFiscalNote', () => {
  it('cancels an AUTHORIZED note within 24h', async () => {
    const note = {
      id: 'cltest_note_001',
      unitId: 'cltest_unit_001',
      status: 'AUTHORIZED',
      externalRef: 'oasys_test_ref',
      issuedAt: new Date(), // Just issued
    };
    mockPrisma.fiscalNote.findFirst.mockResolvedValue(note);
    mockPrisma.fiscalNote.update.mockResolvedValue({
      ...note,
      status: 'CANCELLED',
    });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await service.cancelFiscalNote(
      mockPrisma as any,
      'cltest_note_001',
      'cltest_unit_001',
      'Erro na emissao do pedido, cancelamento necessario.',
      'cltest_employee_001',
    );

    expect(result.success).toBe(true);
    expect(mockFocusNFe.cancelNFCe).toHaveBeenCalledWith(
      'oasys_test_ref',
      'Erro na emissao do pedido, cancelamento necessario.',
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalledOnce();
  });

  it('rejects cancellation after 24h window', async () => {
    const issuedAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    mockPrisma.fiscalNote.findFirst.mockResolvedValue({
      id: 'cltest_note_001',
      unitId: 'cltest_unit_001',
      status: 'AUTHORIZED',
      externalRef: 'oasys_test_ref',
      issuedAt,
    });

    await expect(
      service.cancelFiscalNote(
        mockPrisma as any,
        'cltest_note_001',
        'cltest_unit_001',
        'Late cancellation attempt',
        'cltest_employee_001',
      ),
    ).rejects.toThrow('24h');
  });

  it('rejects cancellation of non-AUTHORIZED note', async () => {
    mockPrisma.fiscalNote.findFirst.mockResolvedValue({
      id: 'cltest_note_001',
      unitId: 'cltest_unit_001',
      status: 'PROCESSING',
      externalRef: 'oasys_test_ref',
    });

    await expect(
      service.cancelFiscalNote(
        mockPrisma as any,
        'cltest_note_001',
        'cltest_unit_001',
        'Should not work on PROCESSING',
        'cltest_employee_001',
      ),
    ).rejects.toThrow('autorizadas');
  });

  it('throws not found for missing note', async () => {
    mockPrisma.fiscalNote.findFirst.mockResolvedValue(null);

    await expect(
      service.cancelFiscalNote(
        mockPrisma as any,
        'nonexistent',
        'cltest_unit_001',
        'Does not exist test justification',
        'cltest_employee_001',
      ),
    ).rejects.toThrow('nao encontrada');
  });
});

// ── listFiscalNotes ─────────────────────────────────────────────────

describe('listFiscalNotes', () => {
  it('returns paginated notes', async () => {
    const notes = [
      { id: 'note_1', status: 'AUTHORIZED' },
      { id: 'note_2', status: 'ERROR' },
    ];
    mockPrisma.fiscalNote.findMany.mockResolvedValue(notes);
    mockPrisma.fiscalNote.count.mockResolvedValue(2);

    const result = await service.listFiscalNotes(
      mockPrisma as any,
      'cltest_unit_001',
      { page: 1, limit: 20 },
    );

    expect(result.notes).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
  });

  it('applies status filter', async () => {
    mockPrisma.fiscalNote.findMany.mockResolvedValue([]);
    mockPrisma.fiscalNote.count.mockResolvedValue(0);

    await service.listFiscalNotes(
      mockPrisma as any,
      'cltest_unit_001',
      { status: 'ERROR', page: 1, limit: 20 },
    );

    expect(mockPrisma.fiscalNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ERROR' }),
      }),
    );
  });
});

// ── getFiscalReport ────────────────────────────────────────────────

describe('getFiscalReport', () => {
  it('returns divergence report', async () => {
    mockPrisma.check.count.mockResolvedValue(10);
    mockPrisma.fiscalNote.groupBy.mockResolvedValue([
      { status: 'AUTHORIZED', _count: { id: 8 } },
      { status: 'ERROR', _count: { id: 1 } },
    ]);
    mockPrisma.fiscalNote.findMany.mockResolvedValue([
      { checkId: 'check_1' },
      { checkId: 'check_2' },
      { checkId: 'check_3' },
      { checkId: 'check_4' },
      { checkId: 'check_5' },
      { checkId: 'check_6' },
      { checkId: 'check_7' },
      { checkId: 'check_8' },
      { checkId: 'check_9' },
    ]);
    mockPrisma.check.findMany.mockResolvedValue([
      { id: 'check_1', totalAmount: null, closedAt: new Date() },
      { id: 'check_2', totalAmount: null, closedAt: new Date() },
      { id: 'check_3', totalAmount: null, closedAt: new Date() },
      { id: 'check_4', totalAmount: null, closedAt: new Date() },
      { id: 'check_5', totalAmount: null, closedAt: new Date() },
      { id: 'check_6', totalAmount: null, closedAt: new Date() },
      { id: 'check_7', totalAmount: null, closedAt: new Date() },
      { id: 'check_8', totalAmount: null, closedAt: new Date() },
      { id: 'check_9', totalAmount: null, closedAt: new Date() },
      { id: 'check_10', totalAmount: null, closedAt: new Date() },
    ]);

    const result = await service.getFiscalReport(
      mockPrisma as any,
      'cltest_unit_001',
      {
        startDate: '2026-03-05T00:00:00.000Z',
        endDate: '2026-03-05T23:59:59.999Z',
      },
    );

    expect(result.totalChecks).toBe(10);
    expect(result.totalNotes).toBe(9);
    expect(result.missingNotes).toBe(1); // check_10 has no fiscal note
    expect(result.statusBreakdown.AUTHORIZED).toBe(8);
    expect(result.statusBreakdown.ERROR).toBe(1);
  });
});
