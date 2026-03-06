import type { FastifyRequest, FastifyReply } from 'fastify';
import { getConfig } from '../../lib/config';
import { getFocusNFeService } from './focusnfe.service';
import type { FocusNFeCallbackPayload } from './focusnfe.types';
import { webhookQuerySchema } from './fiscal.schemas';

/**
 * Handles FocusNFe webhook callbacks.
 * Always returns 200 to avoid re-delivery.
 * Idempotent — safe to receive same callback multiple times.
 */
export async function handleFiscalCallback(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const config = getConfig();
  const prisma = request.server.prisma;

  // 1. Validate token from query string
  const queryParse = webhookQuerySchema.safeParse(request.query);
  if (!queryParse.success || queryParse.data.token !== config.FOCUSNFE_TOKEN) {
    request.log.warn('[fiscal] Webhook received with invalid token');
    reply.status(200).send({ received: true });
    return;
  }

  const payload = request.body as FocusNFeCallbackPayload;

  if (!payload || !payload.ref) {
    request.log.warn('[fiscal] Webhook received without ref');
    reply.status(200).send({ received: true });
    return;
  }

  // 2. Find FiscalNote by externalRef
  const note = await prisma.fiscalNote.findFirst({
    where: { externalRef: payload.ref },
  });

  if (!note) {
    request.log.warn(
      { ref: payload.ref },
      '[fiscal] Webhook received for unknown ref',
    );
    reply.status(200).send({ received: true });
    return;
  }

  // 3. Process by status
  try {
    if (payload.status === 'autorizado') {
      // Idempotent: skip if already AUTHORIZED
      if (note.status === 'AUTHORIZED') {
        reply.status(200).send({ received: true });
        return;
      }

      // Download XML
      let xml: string | null = null;
      try {
        const focusnfe = getFocusNFeService();
        xml = await focusnfe.downloadXML(payload.ref);
      } catch (err) {
        request.log.error(
          { ref: payload.ref, error: err },
          '[fiscal] Failed to download XML',
        );
      }

      await prisma.fiscalNote.update({
        where: { id: note.id },
        data: {
          status: 'AUTHORIZED',
          number: payload.numero ?? null,
          series: payload.serie ?? null,
          accessKey: payload.chave_nfe ?? null,
          xml,
          danfeUrl: payload.url_danfe ?? payload.caminho_danfe ?? null,
          issuedAt: new Date(),
        },
      });

      request.log.info(
        { ref: payload.ref, number: payload.numero },
        '[fiscal] NFC-e authorized',
      );
    } else if (payload.status === 'erro_autorizacao') {
      const errorMsg = payload.mensagem_sefaz
        ? `SEFAZ ${payload.status_sefaz ?? ''}: ${payload.mensagem_sefaz}`
        : 'Erro de autorizacao na SEFAZ';

      await prisma.fiscalNote.update({
        where: { id: note.id },
        data: { status: 'REJECTED', errorMessage: errorMsg },
      });

      // Create critical alert
      await prisma.alert.create({
        data: {
          unitId: note.unitId,
          type: 'SYSTEM',
          severity: 'CRITICAL',
          message: `[Fiscal] NFC-e rejeitada pela SEFAZ — Nota ${note.externalRef}: ${errorMsg}`,
        },
      });

      request.log.warn(
        { ref: payload.ref, error: errorMsg },
        '[fiscal] NFC-e rejected by SEFAZ',
      );
    } else if (payload.status === 'cancelado') {
      await prisma.fiscalNote.update({
        where: { id: note.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

      request.log.info(
        { ref: payload.ref },
        '[fiscal] NFC-e cancelled',
      );
    } else {
      request.log.info(
        { ref: payload.ref, status: payload.status },
        '[fiscal] Webhook received with unhandled status',
      );
    }
  } catch (error) {
    request.log.error(
      { ref: payload.ref, error },
      '[fiscal] Error processing webhook callback',
    );
  }

  // Always return 200
  reply.status(200).send({ received: true });
}
