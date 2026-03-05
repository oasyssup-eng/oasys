import type { FastifyInstance } from 'fastify';
import { getFocusNFeService } from './focusnfe.service';
import { buildNFCePayload, type CheckForFiscal } from './payload-builder';

const INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const MAX_RETRIES = 3;

// Backoff delays in milliseconds: 30s, 2min, 10min
const BACKOFF_MS = [30_000, 120_000, 600_000];

/**
 * Registers a recurring job that auto-retries failed NFC-e notes.
 * Runs every 2 minutes, applies exponential backoff per note.
 */
export function registerFiscalRetryJob(app: FastifyInstance) {
  const timer = setInterval(async () => {
    try {
      // Find ERROR notes that haven't exceeded max retries
      const failedNotes = await app.prisma.fiscalNote.findMany({
        where: {
          status: 'ERROR',
          retryCount: { lt: MAX_RETRIES },
        },
        include: {
          check: {
            include: {
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
              payments: { where: { status: 'CONFIRMED' } },
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
              customer: { select: { name: true } },
            },
          },
        },
      });

      for (const note of failedNotes) {
        // Check backoff: only retry if enough time has passed
        const backoffDelay = BACKOFF_MS[note.retryCount] ?? BACKOFF_MS[BACKOFF_MS.length - 1]!;
        const timeSinceCreated = Date.now() - note.createdAt.getTime();

        // Use createdAt as base for first attempt, updatedAt would be better
        // but we only have createdAt. Check sufficient time has passed.
        if (timeSinceCreated < backoffDelay * (note.retryCount + 1)) {
          continue;
        }

        try {
          const payload = buildNFCePayload(
            note.check as unknown as CheckForFiscal,
            note.customerCpf ?? undefined,
          );

          const focusnfe = getFocusNFeService();
          await focusnfe.emitNFCe(note.externalRef, payload);

          await app.prisma.fiscalNote.update({
            where: { id: note.id },
            data: {
              status: 'PROCESSING',
              errorMessage: null,
              retryCount: note.retryCount + 1,
            },
          });

          app.log.info(
            { noteId: note.id, retry: note.retryCount + 1 },
            '[fiscal] Auto-retry successful, now PROCESSING',
          );
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown retry error';

          const newRetryCount = note.retryCount + 1;
          await app.prisma.fiscalNote.update({
            where: { id: note.id },
            data: {
              errorMessage: errorMsg,
              retryCount: newRetryCount,
            },
          });

          // If max retries exceeded, create a critical alert
          if (newRetryCount >= MAX_RETRIES) {
            await app.prisma.alert.create({
              data: {
                unitId: note.unitId,
                type: 'SYSTEM',
                severity: 'CRITICAL',
                message: `[Fiscal] Nota ${note.externalRef} falhou ${MAX_RETRIES} vezes. Ultimo erro: ${errorMsg}. Intervencao manual necessaria.`,
              },
            });

            app.log.error(
              { noteId: note.id, retries: newRetryCount },
              '[fiscal] Max retries exceeded for note',
            );
          }
        }
      }
    } catch (error) {
      app.log.error(
        { event: 'fiscal.retry_job_error', error },
        'Fiscal retry job failed',
      );
    }
  }, INTERVAL_MS);

  app.addHook('onClose', () => {
    clearInterval(timer);
  });

  app.log.info('Fiscal retry job registered (every 2min)');
}
