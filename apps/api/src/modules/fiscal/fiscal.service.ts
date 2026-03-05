import type { PrismaClient } from '@prisma/client';
import { AppError } from '../../lib/errors';
import { getFocusNFeService } from './focusnfe.service';
import {
  buildNFCePayload,
  validateFiscalFields,
  type CheckForFiscal,
} from './payload-builder';
import type { ListFiscalNotesQuery, FiscalReportQuery } from './fiscal.schemas';

// ── Include shape for the check query ──────────────────────────────
const CHECK_FOR_FISCAL_INCLUDE = {
  orders: {
    include: {
      items: {
        include: {
          product: {
            include: { category: { select: { name: true } } },
          },
        },
      },
    },
  },
  payments: { where: { status: 'CONFIRMED' as const } },
  unit: {
    select: {
      id: true,
      name: true,
      cnpj: true,
      stateRegistration: true,
      legalName: true,
      streetAddress: true,
      addressNumber: true,
      neighborhood: true,
      city: true,
      state: true,
      zipCode: true,
      ibgeCode: true,
    },
  },
  customer: {
    select: { name: true, phone: true },
  },
} as const;

// ── Auto-emit NFC-e for a PAID check ──────────────────────────────

export async function emitNFCeForCheck(
  prisma: PrismaClient,
  checkId: string,
  customerCpf?: string,
): Promise<{ fiscalNoteId: string | null; skipped: boolean; reason?: string }> {
  // 1. Fetch check with all needed relations
  const check = await prisma.check.findUnique({
    where: { id: checkId },
    include: CHECK_FOR_FISCAL_INCLUDE,
  });

  if (!check) {
    return { fiscalNoteId: null, skipped: true, reason: 'Check not found' };
  }

  // 2. Validate fiscal fields
  const missingFields = validateFiscalFields(check.unit);
  if (missingFields.length > 0) {
    // Create alert about missing fiscal config
    await prisma.alert.create({
      data: {
        unitId: check.unit.id,
        type: 'SYSTEM',
        severity: 'CRITICAL',
        message: `[Fiscal] Dados fiscais incompletos — Campos ausentes para emissao de NFC-e: ${missingFields.join(', ')}. Configure em Unidade > Dados Fiscais.`,
      },
    });
    return {
      fiscalNoteId: null,
      skipped: true,
      reason: `Missing fiscal fields: ${missingFields.join(', ')}`,
    };
  }

  // 3. Check if all orders are cortesia → skip (no fiscal items)
  const allCortesia = check.orders.every(
    (o) => o.isCortesia || o.status === 'CANCELLED',
  );
  if (allCortesia) {
    return {
      fiscalNoteId: null,
      skipped: true,
      reason: 'All orders are cortesia or cancelled',
    };
  }

  // 4. Idempotency: check if FiscalNote already exists for this check
  const existing = await prisma.fiscalNote.findFirst({
    where: { checkId, status: { not: 'CANCELLED' } },
  });
  if (existing) {
    return { fiscalNoteId: existing.id, skipped: true, reason: 'Already emitted' };
  }

  // 5. Generate external reference
  const unitSlice = check.unit.id.slice(-8);
  const checkSlice = check.id.slice(-8);
  const externalRef = `oasys_${unitSlice}_${checkSlice}_${Date.now()}`;

  // 6. Calculate total from confirmed payments
  const totalAmount = check.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );

  // 7. Create FiscalNote with PENDING status
  const fiscalNote = await prisma.fiscalNote.create({
    data: {
      unitId: check.unit.id,
      checkId,
      externalRef,
      status: 'PENDING',
      type: 'NFCE',
      totalAmount,
      customerCpf: customerCpf ?? null,
    },
  });

  // 8. Build NFC-e payload
  const payload = buildNFCePayload(
    check as unknown as CheckForFiscal,
    customerCpf,
  );

  // 9. Send to FocusNFe
  try {
    const focusnfe = getFocusNFeService();
    await focusnfe.emitNFCe(externalRef, payload);

    // Update to PROCESSING
    await prisma.fiscalNote.update({
      where: { id: fiscalNote.id },
      data: { status: 'PROCESSING' },
    });

    return { fiscalNoteId: fiscalNote.id, skipped: false };
  } catch (error) {
    // Update to ERROR
    const errorMsg =
      error instanceof Error ? error.message : 'Unknown FocusNFe error';
    await prisma.fiscalNote.update({
      where: { id: fiscalNote.id },
      data: { status: 'ERROR', errorMessage: errorMsg },
    });

    console.error('[fiscal] emitNFCe failed:', errorMsg);
    return { fiscalNoteId: fiscalNote.id, skipped: false };
  }
}

// ── Cancel fiscal note ────────────────────────────────────────────

export async function cancelFiscalNote(
  prisma: PrismaClient,
  noteId: string,
  unitId: string,
  justification: string,
  employeeId: string,
): Promise<{ success: boolean }> {
  const note = await prisma.fiscalNote.findFirst({
    where: { id: noteId, unitId },
  });

  if (!note) {
    throw AppError.notFound('Nota fiscal nao encontrada');
  }

  if (note.status !== 'AUTHORIZED') {
    throw AppError.badRequest(
      `Somente notas autorizadas podem ser canceladas. Status atual: ${note.status}`,
    );
  }

  // Check 24h cancellation window
  if (note.issuedAt) {
    const hoursSinceIssued =
      (Date.now() - note.issuedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceIssued > 24) {
      throw AppError.badRequest(
        'Prazo de 24h para cancelamento expirado. Utilize carta de correcao.',
      );
    }
  }

  try {
    const focusnfe = getFocusNFeService();
    await focusnfe.cancelNFCe(note.externalRef, justification);

    await prisma.fiscalNote.update({
      where: { id: noteId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        unitId,
        employeeId,
        action: 'FISCAL_NOTE_CANCELLED',
        entity: 'FiscalNote',
        entityId: noteId,
        after: { justification, externalRef: note.externalRef },
      },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) throw error;
    const errorMsg =
      error instanceof Error ? error.message : 'Unknown cancel error';
    throw AppError.badGateway(
      `Falha ao cancelar NFC-e no FocusNFe: ${errorMsg}`,
    );
  }
}

// ── Manual retry ──────────────────────────────────────────────────

export async function retryFiscalNote(
  prisma: PrismaClient,
  noteId: string,
  unitId: string,
): Promise<{ success: boolean }> {
  const note = await prisma.fiscalNote.findFirst({
    where: { id: noteId, unitId, status: { in: ['ERROR', 'REJECTED'] } },
  });

  if (!note) {
    throw AppError.notFound(
      'Nota fiscal nao encontrada ou nao esta em estado de erro',
    );
  }

  // Re-fetch the check and rebuild payload
  const check = await prisma.check.findUnique({
    where: { id: note.checkId },
    include: CHECK_FOR_FISCAL_INCLUDE,
  });

  if (!check) {
    throw AppError.notFound('Conta associada nao encontrada');
  }

  const payload = buildNFCePayload(
    check as unknown as CheckForFiscal,
    note.customerCpf ?? undefined,
  );

  try {
    const focusnfe = getFocusNFeService();
    await focusnfe.emitNFCe(note.externalRef, payload);

    await prisma.fiscalNote.update({
      where: { id: noteId },
      data: {
        status: 'PROCESSING',
        errorMessage: null,
        retryCount: { increment: 1 },
      },
    });

    return { success: true };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : 'Unknown retry error';
    await prisma.fiscalNote.update({
      where: { id: noteId },
      data: {
        errorMessage: errorMsg,
        retryCount: { increment: 1 },
      },
    });
    throw AppError.badGateway(
      `Falha ao reenviar NFC-e: ${errorMsg}`,
    );
  }
}

// ── List fiscal notes ─────────────────────────────────────────────

export async function listFiscalNotes(
  prisma: PrismaClient,
  unitId: string,
  filters: ListFiscalNotesQuery,
): Promise<{ notes: unknown[]; total: number; page: number; limit: number }> {
  const where: Record<string, unknown> = { unitId };

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.checkId) {
    where.checkId = filters.checkId;
  }
  if (filters.startDate || filters.endDate) {
    where.createdAt = {
      ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
      ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
    };
  }

  const [notes, total] = await Promise.all([
    prisma.fiscalNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      include: {
        check: {
          select: {
            id: true,
            tableId: true,
            totalAmount: true,
          },
        },
      },
    }),
    prisma.fiscalNote.count({ where }),
  ]);

  return { notes, total, page: filters.page, limit: filters.limit };
}

// ── Get single fiscal note ────────────────────────────────────────

export async function getFiscalNoteById(
  prisma: PrismaClient,
  noteId: string,
  unitId: string,
) {
  const note = await prisma.fiscalNote.findFirst({
    where: { id: noteId, unitId },
    include: {
      check: {
        select: {
          id: true,
          tableId: true,
          totalAmount: true,
          openedAt: true,
          closedAt: true,
        },
      },
    },
  });

  if (!note) {
    throw AppError.notFound('Nota fiscal nao encontrada');
  }

  return note;
}

// ── Fiscal divergence report ──────────────────────────────────────

export async function getFiscalReport(
  prisma: PrismaClient,
  unitId: string,
  query: FiscalReportQuery,
) {
  const startDate = new Date(query.startDate);
  const endDate = new Date(query.endDate);

  // Total PAID checks in the period
  const totalChecks = await prisma.check.count({
    where: {
      unitId,
      status: 'PAID',
      closedAt: { gte: startDate, lte: endDate },
    },
  });

  // Fiscal notes in the period
  const notesByStatus = await prisma.fiscalNote.groupBy({
    by: ['status'],
    where: {
      unitId,
      createdAt: { gte: startDate, lte: endDate },
    },
    _count: { id: true },
  });

  const totalNotes = notesByStatus.reduce(
    (sum, group) => sum + group._count.id,
    0,
  );

  const statusBreakdown: Record<string, number> = {};
  for (const group of notesByStatus) {
    statusBreakdown[group.status] = group._count.id;
  }

  // Missing notes: PAID checks without any non-cancelled fiscal note
  const checksWithNotes = await prisma.fiscalNote.findMany({
    where: {
      unitId,
      createdAt: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' },
    },
    select: { checkId: true },
    distinct: ['checkId'],
  });

  const checkIdsWithNotes = new Set(checksWithNotes.map((n) => n.checkId));

  const paidChecks = await prisma.check.findMany({
    where: {
      unitId,
      status: 'PAID',
      closedAt: { gte: startDate, lte: endDate },
    },
    select: { id: true, totalAmount: true, closedAt: true },
  });

  const missingNotes = paidChecks.filter(
    (c) => !checkIdsWithNotes.has(c.id),
  );

  return {
    period: { startDate: query.startDate, endDate: query.endDate },
    totalChecks,
    totalNotes,
    missingNotes: missingNotes.length,
    statusBreakdown,
    missingCheckIds: missingNotes.map((c) => ({
      checkId: c.id,
      totalAmount: c.totalAmount ? Number(c.totalAmount) : 0,
      closedAt: c.closedAt?.toISOString() ?? null,
    })),
  };
}
