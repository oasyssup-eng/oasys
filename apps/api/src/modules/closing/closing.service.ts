import type { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../../lib/errors';
import {
  calculateRevenue,
  calculatePaymentSummary,
  calculateCashSummary,
  calculateFiscalSummary,
  calculateHourlyRevenue,
  calculateOperations,
  type ConsolidationCheck,
  type ConsolidationPayment,
  type ConsolidationCashRegister,
  type ConsolidationFiscalNote,
} from './consolidation';
import { reconcile } from './reconciliation';
import { calculateComparison } from './comparison';
import type { ExecuteClosingInput, ClosingHistoryQuery } from './closing.schemas';

// ── Data loading helpers ─────────────────────────────────────────────

function toNumber(val: unknown): number {
  if (val == null) return 0;
  return Number(val);
}

async function loadChecksForDay(
  prisma: PrismaClient,
  unitId: string,
  startDate: Date,
  endDate: Date,
): Promise<ConsolidationCheck[]> {
  const rawChecks = await prisma.check.findMany({
    where: {
      unitId,
      OR: [
        { closedAt: { gte: startDate, lt: endDate } },
        { status: 'OPEN', openedAt: { gte: startDate, lt: endDate } },
      ],
    },
    include: {
      orders: {
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  return rawChecks.map((c) => ({
    id: c.id,
    status: c.status,
    totalAmount: toNumber(c.totalAmount),
    serviceFeeAmount: toNumber(c.serviceFeeAmount),
    tipAmount: toNumber(c.tipAmount),
    discountAmount: toNumber(c.discountAmount),
    splitParentId: c.splitParentId,
    mergedIntoId: c.mergedIntoId,
    closedAt: c.closedAt,
    orders: c.orders.map((o) => ({
      status: o.status,
      isCortesia: o.isCortesia,
      staffMealEmployeeId: o.staffMealEmployeeId,
      items: o.items.map((item) => ({
        quantity: item.quantity,
        unitPrice: toNumber(item.unitPrice),
        totalPrice: toNumber(item.totalPrice),
        product: item.product,
      })),
    })),
  }));
}

async function loadPaymentsForDay(
  prisma: PrismaClient,
  unitId: string,
  startDate: Date,
  endDate: Date,
): Promise<ConsolidationPayment[]> {
  const rawPayments = await prisma.payment.findMany({
    where: {
      check: { unitId },
      createdAt: { gte: startDate, lt: endDate },
    },
  });

  return rawPayments.map((p) => ({
    method: p.method,
    amount: toNumber(p.amount),
    status: p.status,
  }));
}

async function loadCashRegistersForDay(
  prisma: PrismaClient,
  unitId: string,
  startDate: Date,
  endDate: Date,
): Promise<ConsolidationCashRegister[]> {
  const rawRegisters = await prisma.cashRegister.findMany({
    where: {
      unitId,
      openedAt: { gte: startDate, lt: endDate },
    },
    include: {
      operations: { select: { type: true, amount: true } },
      payments: { select: { amount: true, method: true } },
    },
  });

  return rawRegisters.map((reg) => ({
    id: reg.id,
    type: reg.type,
    status: reg.status,
    employeeId: reg.employeeId,
    openingBalance: toNumber(reg.openingBalance),
    closingBalance: toNumber(reg.closingBalance),
    expectedBalance: toNumber(reg.expectedBalance),
    difference: toNumber(reg.difference),
    operations: reg.operations.map((op) => ({
      type: op.type,
      amount: toNumber(op.amount),
    })),
    payments: reg.payments.map((p) => ({
      amount: toNumber(p.amount),
      method: p.method,
    })),
  }));
}

async function loadFiscalNotesForDay(
  prisma: PrismaClient,
  unitId: string,
  startDate: Date,
  endDate: Date,
): Promise<ConsolidationFiscalNote[]> {
  const rawNotes = await prisma.fiscalNote.findMany({
    where: {
      unitId,
      createdAt: { gte: startDate, lt: endDate },
    },
  });

  return rawNotes.map((n) => ({
    id: n.id,
    checkId: n.checkId,
    status: n.status,
    totalAmount: toNumber(n.totalAmount),
  }));
}

// ── Date boundaries ──────────────────────────────────────────────────

function getDayBoundaries(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);
  return { start, end };
}

// ── Preflight ────────────────────────────────────────────────────────

export interface PreflightResult {
  canClose: boolean;
  blockers: { type: string; message: string }[];
  warnings: { type: string; message: string }[];
  summary: {
    totalChecks: number;
    paidChecks: number;
    openChecks: number;
    openRegisters: number;
  };
}

export async function preflight(
  prisma: PrismaClient,
  unitId: string,
  date?: string,
): Promise<PreflightResult> {
  const today = date ?? new Date().toISOString().split('T')[0]!;
  const { start, end } = getDayBoundaries(today);

  const blockers: { type: string; message: string }[] = [];
  const warnings: { type: string; message: string }[] = [];

  // Check for open cash registers
  const openRegisters = await prisma.cashRegister.count({
    where: { unitId, status: 'OPEN' },
  });
  if (openRegisters > 0) {
    blockers.push({
      type: 'OPEN_CASH_REGISTERS',
      message: `${openRegisters} caixa(s) ainda aberto(s). Feche todos os caixas antes de fechar o dia.`,
    });
  }

  // Check if day already closed
  const existingReport = await prisma.dailyReport.findUnique({
    where: {
      unitId_date: { unitId, date: new Date(today) },
    },
  });
  if (existingReport && existingReport.status === 'CLOSED') {
    blockers.push({
      type: 'ALREADY_CLOSED',
      message: 'Este dia já foi fechado. Use a opção de reabertura se necessário.',
    });
  }

  // Check for open checks
  const openChecks = await prisma.check.count({
    where: {
      unitId,
      status: 'OPEN',
      openedAt: { gte: start, lt: end },
    },
  });
  if (openChecks > 0) {
    warnings.push({
      type: 'OPEN_CHECKS',
      message: `${openChecks} conta(s) ainda aberta(s).`,
    });
  }

  // Check for pending payments
  const pendingPayments = await prisma.payment.count({
    where: {
      check: { unitId },
      status: 'PENDING',
      createdAt: { gte: start, lt: end },
    },
  });
  if (pendingPayments > 0) {
    warnings.push({
      type: 'PENDING_PAYMENTS',
      message: `${pendingPayments} pagamento(s) pendente(s).`,
    });
  }

  // Check for fiscal errors
  const fiscalErrors = await prisma.fiscalNote.count({
    where: {
      unitId,
      status: { in: ['ERROR', 'REJECTED'] },
      createdAt: { gte: start, lt: end },
    },
  });
  if (fiscalErrors > 0) {
    warnings.push({
      type: 'FISCAL_ERRORS',
      message: `${fiscalErrors} nota(s) fiscal(is) com erro ou rejeitada(s).`,
    });
  }

  // Summary
  const totalChecks = await prisma.check.count({
    where: { unitId, openedAt: { gte: start, lt: end } },
  });
  const paidChecks = await prisma.check.count({
    where: { unitId, status: 'PAID', closedAt: { gte: start, lt: end } },
  });

  return {
    canClose: blockers.length === 0,
    blockers,
    warnings,
    summary: {
      totalChecks,
      paidChecks,
      openChecks,
      openRegisters,
    },
  };
}

// ── Execute Closing ──────────────────────────────────────────────────

export async function executeClosing(
  prisma: PrismaClient,
  unitId: string,
  input: ExecuteClosingInput,
  employeeId: string,
) {
  // 1. Validate date not in future
  const today = new Date().toISOString().split('T')[0]!;
  if (input.date > today) {
    throw AppError.badRequest('Não é possível fechar um dia futuro');
  }

  // 2. Run preflight
  const preflightResult = await preflight(prisma, unitId, input.date);

  // 3. Check blockers
  if (preflightResult.blockers.length > 0) {
    const isReopenedDay = preflightResult.blockers.some(
      (b) => b.type === 'ALREADY_CLOSED',
    );
    if (isReopenedDay) {
      // Check if actually REOPENED (allowed to re-close)
      const existing = await prisma.dailyReport.findUnique({
        where: { unitId_date: { unitId, date: new Date(input.date) } },
      });
      if (existing?.status !== 'REOPENED') {
        throw AppError.conflict('Este dia já foi fechado');
      }
      // Delete old report to re-close (transaction will handle atomicity)
      await prisma.hourlyRevenue.deleteMany({
        where: { dailyReportId: existing.id },
      });
      await prisma.dailyReport.delete({ where: { id: existing.id } });
    } else {
      throw AppError.badRequest(
        `Não é possível fechar: ${preflightResult.blockers.map((b) => b.message).join('; ')}`,
      );
    }
  }

  // 4. Check warnings + acknowledge
  if (preflightResult.warnings.length > 0 && !input.acknowledgeWarnings) {
    throw AppError.badRequest(
      'Existem avisos pendentes. Confirme com acknowledgeWarnings=true para prosseguir.',
      'WARNINGS_NOT_ACKNOWLEDGED',
    );
  }

  // 5. Fetch all data for the day
  const { start, end } = getDayBoundaries(input.date);
  const [checks, payments, cashRegisters, fiscalNotes] = await Promise.all([
    loadChecksForDay(prisma, unitId, start, end),
    loadPaymentsForDay(prisma, unitId, start, end),
    loadCashRegistersForDay(prisma, unitId, start, end),
    loadFiscalNotesForDay(prisma, unitId, start, end),
  ]);

  // 6. Run all consolidation functions
  const revenue = calculateRevenue(checks);
  const paymentSummary = calculatePaymentSummary(payments);
  const cashSummary = calculateCashSummary(cashRegisters);
  const paidCheckIds = checks
    .filter((c) => c.status === 'PAID')
    .map((c) => c.id);
  const fiscalSummary = calculateFiscalSummary(fiscalNotes, paidCheckIds);
  const hourlyData = calculateHourlyRevenue(checks);
  const operations = calculateOperations(checks);

  // 7. Reconciliation + comparison
  const reconciliation = reconcile(
    revenue,
    paymentSummary,
    cashSummary,
    fiscalSummary,
  );

  const comparison = await calculateComparison(
    prisma,
    unitId,
    input.date,
    revenue.netRevenue,
    operations.paidChecks,
  );

  // 8. Build rawData snapshot (JSON round-trip for Prisma InputJsonValue compat)
  const rawData = JSON.parse(JSON.stringify({
    revenue,
    paymentSummary,
    cashSummary,
    fiscalSummary,
    hourlyData,
    operations,
    reconciliation,
    comparison,
  })) as Prisma.InputJsonValue;

  // 9. Create DailyReport + HourlyRevenue in transaction
  const result = await prisma.$transaction(async (tx) => {
    const report = await tx.dailyReport.create({
      data: {
        unitId,
        date: new Date(input.date),
        status: 'CLOSED',
        closedBy: employeeId,
        closedAt: new Date(),
        notes: input.closingNotes ?? null,
        // Legacy fields (backward compatibility)
        totalRevenue: revenue.netRevenue,
        totalOrders: operations.totalOrders,
        totalCancellations: operations.cancelledOrders,
        averageTicket: operations.avgTicket,
        paymentBreakdown: paymentSummary.byMethod,
        // New financial breakdown
        grossRevenue: revenue.grossRevenue,
        netRevenue: revenue.netRevenue,
        totalPayments: paymentSummary.totalConfirmed,
        serviceFees: revenue.serviceFees,
        tips: revenue.tips,
        discounts: revenue.discounts,
        cancellationAmount: revenue.cancellationAmount,
        courtesyAmount: revenue.courtesyAmount,
        staffMealAmount: revenue.staffMealAmount,
        totalChecks: operations.totalChecks,
        paidChecks: operations.paidChecks,
        openChecks: operations.openChecks,
        rawData,
      },
    });

    // Create HourlyRevenue records
    if (hourlyData.length > 0) {
      await tx.hourlyRevenue.createMany({
        data: hourlyData.map((h) => ({
          unitId,
          dailyReportId: report.id,
          date: new Date(input.date),
          hour: h.hour,
          revenue: h.revenue,
          orderCount: h.orderCount,
          checkCount: h.checkCount,
        })),
      });
    }

    return report;
  });

  return {
    report: result,
    revenue,
    paymentSummary,
    cashSummary,
    fiscalSummary,
    hourlyData,
    operations,
    reconciliation,
    comparison,
  };
}

// ── Reopen Closing ───────────────────────────────────────────────────

const MAX_REOPENS = 3;

export async function reopenClosing(
  prisma: PrismaClient,
  closingId: string,
  unitId: string,
  reason: string,
  employeeId: string,
): Promise<{ success: boolean }> {
  const report = await prisma.dailyReport.findFirst({
    where: { id: closingId, unitId },
  });

  if (!report) {
    throw AppError.notFound('Fechamento nao encontrado');
  }

  if (report.reopenCount >= MAX_REOPENS) {
    throw new AppError(
      429,
      `Limite de ${MAX_REOPENS} reaberturas atingido para este dia. Contate o suporte.`,
      'TOO_MANY_REOPENS',
    );
  }

  // Update report status
  await prisma.dailyReport.update({
    where: { id: closingId },
    data: {
      status: 'REOPENED',
      reopenedAt: new Date(),
      reopenReason: reason,
      reopenCount: { increment: 1 },
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      unitId,
      employeeId,
      action: 'DAILY_REPORT_REOPENED',
      entity: 'DailyReport',
      entityId: closingId,
      after: { reason, reopenCount: report.reopenCount + 1 },
    },
  });

  // Delete associated HourlyRevenue records (will be regenerated on re-close)
  await prisma.hourlyRevenue.deleteMany({
    where: { dailyReportId: closingId },
  });

  return { success: true };
}

// ── Get Current Day (Live) ───────────────────────────────────────────

export async function getCurrentDay(
  prisma: PrismaClient,
  unitId: string,
  date?: string,
) {
  const today = date ?? new Date().toISOString().split('T')[0]!;
  const { start, end } = getDayBoundaries(today);

  // Check if already closed
  const existingReport = await prisma.dailyReport.findUnique({
    where: { unitId_date: { unitId, date: new Date(today) } },
  });

  const [checks, payments, cashRegisters, fiscalNotes] = await Promise.all([
    loadChecksForDay(prisma, unitId, start, end),
    loadPaymentsForDay(prisma, unitId, start, end),
    loadCashRegistersForDay(prisma, unitId, start, end),
    loadFiscalNotesForDay(prisma, unitId, start, end),
  ]);

  const revenue = calculateRevenue(checks);
  const paymentSummary = calculatePaymentSummary(payments);
  const cashSummary = calculateCashSummary(cashRegisters);
  const paidCheckIds = checks.filter((c) => c.status === 'PAID').map((c) => c.id);
  const fiscalSummary = calculateFiscalSummary(fiscalNotes, paidCheckIds);
  const hourlyData = calculateHourlyRevenue(checks);
  const operations = calculateOperations(checks);

  return {
    date: today,
    isClosed: existingReport?.status === 'CLOSED',
    isReopened: existingReport?.status === 'REOPENED',
    revenue,
    paymentSummary,
    cashSummary,
    fiscalSummary,
    hourlyData,
    operations,
  };
}

// ── Closing History ──────────────────────────────────────────────────

export async function getClosingHistory(
  prisma: PrismaClient,
  unitId: string,
  query: ClosingHistoryQuery,
) {
  const where: Record<string, unknown> = { unitId };

  if (query.startDate || query.endDate) {
    where.date = {
      ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
      ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
    };
  }

  const [reports, total] = await Promise.all([
    prisma.dailyReport.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: query.offset,
      take: query.limit,
      select: {
        id: true,
        date: true,
        status: true,
        netRevenue: true,
        grossRevenue: true,
        totalChecks: true,
        paidChecks: true,
        averageTicket: true,
        closedAt: true,
        closedBy: true,
        reopenCount: true,
      },
    }),
    prisma.dailyReport.count({ where }),
  ]);

  return { reports, total, limit: query.limit, offset: query.offset };
}

// ── Closing Detail ───────────────────────────────────────────────────

export async function getClosingDetail(
  prisma: PrismaClient,
  closingId: string,
  unitId: string,
) {
  const report = await prisma.dailyReport.findFirst({
    where: { id: closingId, unitId },
    include: {
      hourlyRevenues: {
        orderBy: { hour: 'asc' },
      },
    },
  });

  if (!report) {
    throw AppError.notFound('Fechamento nao encontrado');
  }

  return report;
}
