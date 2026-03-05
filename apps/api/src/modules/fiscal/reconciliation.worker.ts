import type { FastifyInstance } from 'fastify';
import { getFocusNFeService } from './focusnfe.service';

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Registers a recurring reconciliation job that:
 * 1. Finds PAID checks without FiscalNotes → creates alerts
 * 2. Finds PROCESSING notes older than 1h → queries FocusNFe for status
 * 3. Counts unresolved ERROR notes → summary alert
 */
export function registerFiscalReconciliationJob(app: FastifyInstance) {
  const timer = setInterval(async () => {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // 1. Find PAID checks from last 24h without FiscalNotes
      const checksWithoutNotes = await findChecksWithoutNotes(
        app,
        oneDayAgo,
        now,
      );

      if (checksWithoutNotes.length > 0) {
        // Create a single summary alert per unit
        const byUnit = new Map<string, number>();
        for (const check of checksWithoutNotes) {
          const count = byUnit.get(check.unitId) ?? 0;
          byUnit.set(check.unitId, count + 1);
        }

        for (const [unitId, count] of byUnit) {
          await app.prisma.alert.create({
            data: {
              unitId,
              type: 'SYSTEM',
              severity: 'WARNING',
              message: `[Fiscal] ${count} conta(s) paga(s) nas ultimas 24h sem NFC-e emitida. Verifique em Fiscal > Relatorio.`,
            },
          });
        }

        app.log.warn(
          { count: checksWithoutNotes.length },
          '[fiscal] Found PAID checks without fiscal notes',
        );
      }

      // 2. Find PROCESSING notes older than 1h → query FocusNFe
      const staleNotes = await app.prisma.fiscalNote.findMany({
        where: {
          status: 'PROCESSING',
          createdAt: { lt: oneHourAgo },
        },
      });

      if (staleNotes.length > 0) {
        try {
          const focusnfe = getFocusNFeService();

          for (const note of staleNotes) {
            try {
              const result = await focusnfe.getStatus(note.externalRef);

              if (result.status === 'autorizado') {
                await app.prisma.fiscalNote.update({
                  where: { id: note.id },
                  data: {
                    status: 'AUTHORIZED',
                    number: result.numero ?? null,
                    series: result.serie ?? null,
                    accessKey: result.chave_nfe ?? null,
                    danfeUrl: result.url_danfe ?? result.caminho_danfe ?? null,
                    issuedAt: new Date(),
                  },
                });
              } else if (
                result.status === 'erro_autorizacao' ||
                result.status === 'rejeitado'
              ) {
                const errorMsg = result.mensagem_sefaz
                  ? `SEFAZ ${result.status_sefaz ?? ''}: ${result.mensagem_sefaz}`
                  : 'Erro de autorizacao na SEFAZ';

                await app.prisma.fiscalNote.update({
                  where: { id: note.id },
                  data: { status: 'REJECTED', errorMessage: errorMsg },
                });
              }
            } catch (err) {
              app.log.warn(
                { noteId: note.id, error: err },
                '[fiscal] Failed to check stale note status',
              );
            }
          }
        } catch {
          // FocusNFe service not configured — skip
        }
      }

      // 3. Count unresolved ERROR notes
      const errorCount = await app.prisma.fiscalNote.count({
        where: { status: 'ERROR' },
      });

      if (errorCount > 0) {
        app.log.info(
          { errorCount },
          '[fiscal] Unresolved fiscal note errors',
        );
      }
    } catch (error) {
      app.log.error(
        { event: 'fiscal.reconciliation_job_error', error },
        'Fiscal reconciliation job failed',
      );
    }
  }, INTERVAL_MS);

  app.addHook('onClose', () => {
    clearInterval(timer);
  });

  app.log.info('Fiscal reconciliation job registered (every 30min)');
}

// ── Helper: Find PAID checks without fiscal notes ────────────────

async function findChecksWithoutNotes(
  app: FastifyInstance,
  startDate: Date,
  endDate: Date,
) {
  // Get check IDs that already have non-cancelled fiscal notes
  const notedCheckIds = await app.prisma.fiscalNote.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' },
    },
    select: { checkId: true },
    distinct: ['checkId'],
  });

  const hasNoteSet = new Set(notedCheckIds.map((n) => n.checkId));

  // Get all PAID checks in the period
  const paidChecks = await app.prisma.check.findMany({
    where: {
      status: 'PAID',
      closedAt: { gte: startDate, lte: endDate },
    },
    select: { id: true, unitId: true },
  });

  return paidChecks.filter((c) => !hasNoteSet.has(c.id));
}
