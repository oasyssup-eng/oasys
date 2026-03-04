import type { FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient } from '@oasys/database';
import { getPagarmeService } from './pagarme.service';
import { checkPaymentCompletion } from './payments.service';
import type { PagarmeWebhookPayload } from './pagarme.types';

export async function handleWebhook(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const prisma = request.server.prisma;
  const rawBody =
    typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body);

  // Validate HMAC signature
  const signature = request.headers['x-hub-signature'] as string | undefined;
  if (!signature) {
    return reply.status(401).send({ error: 'Missing webhook signature' });
  }

  const pagarme = getPagarmeService();
  if (!pagarme.validateWebhookSignature(rawBody, signature)) {
    request.log.warn(
      { event: 'payment.webhook_invalid_signature' },
      'Invalid webhook signature',
    );
    return reply.status(401).send({ error: 'Invalid webhook signature' });
  }

  const payload = (
    typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body
  ) as PagarmeWebhookPayload;

  const externalId = payload.data?.id;
  if (!externalId) {
    return reply.status(200).send({ received: true });
  }

  // Find payment by externalId
  const payment = await prisma.payment.findFirst({
    where: { externalId },
  });

  if (!payment) {
    request.log.warn(
      { event: 'payment.webhook_unknown', externalId },
      'Webhook received for unknown payment',
    );
    return reply.status(200).send({ received: true });
  }

  // Map event types to payment status
  await processWebhookEvent(prisma, payment.id, payment.checkId, payload, request);

  return reply.status(200).send({ received: true });
}

async function processWebhookEvent(
  prisma: PrismaClient,
  paymentId: string,
  checkId: string,
  payload: PagarmeWebhookPayload,
  request: FastifyRequest,
) {
  const eventType = payload.type;

  switch (eventType) {
    case 'order.paid': {
      // Idempotent: skip if already confirmed
      const existing = await prisma.payment.findUnique({
        where: { id: paymentId },
      });
      if (existing?.status === 'CONFIRMED') return;

      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'CONFIRMED',
          paidAt: new Date(),
        },
      });

      request.log.info(
        { event: 'payment.confirmed', paymentId, checkId },
        'Payment confirmed via webhook',
      );

      await checkPaymentCompletion(prisma, checkId);
      break;
    }

    case 'order.payment_failed': {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'FAILED' },
      });

      request.log.warn(
        { event: 'payment.failed', paymentId, checkId },
        'Payment failed via webhook',
      );
      break;
    }

    case 'order.canceled': {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'CANCELLED' },
      });

      request.log.info(
        { event: 'payment.cancelled', paymentId, checkId },
        'Payment cancelled via webhook',
      );
      break;
    }

    case 'charge.refunded': {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'REFUNDED' },
      });

      request.log.info(
        { event: 'payment.refunded', paymentId, checkId },
        'Payment refunded via webhook',
      );
      break;
    }

    default:
      request.log.info(
        { event: 'payment.webhook_unhandled', eventType },
        'Unhandled webhook event type',
      );
  }
}
