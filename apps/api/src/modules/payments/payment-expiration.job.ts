import type { FastifyInstance } from 'fastify';

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Registers a recurring job that cancels PENDING payments whose
 * expiresAt has passed. Runs every 5 minutes.
 */
export function registerPaymentExpirationJob(app: FastifyInstance) {
  const timer = setInterval(async () => {
    try {
      const result = await app.prisma.payment.updateMany({
        where: {
          status: 'PENDING',
          expiresAt: { lt: new Date() },
        },
        data: { status: 'CANCELLED' },
      });

      if (result.count > 0) {
        app.log.info(
          { event: 'payment.expiration_job', cancelled: result.count },
          `Cancelled ${result.count} expired pending payment(s)`,
        );
      }
    } catch (error) {
      app.log.error(
        { event: 'payment.expiration_job_error', error },
        'Payment expiration job failed',
      );
    }
  }, INTERVAL_MS);

  // Clean up on server close
  app.addHook('onClose', () => {
    clearInterval(timer);
  });

  app.log.info('Payment expiration job registered (every 5 min)');
}
