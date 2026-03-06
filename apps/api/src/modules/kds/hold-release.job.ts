import type { FastifyInstance } from 'fastify';
import { publishKDSEvent } from './ws.handler';

const INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Registers a recurring job that releases HELD orders whose
 * holdUntil has expired. Runs every 60 seconds.
 */
export function registerHoldReleaseJob(app: FastifyInstance) {
  const timer = setInterval(async () => {
    try {
      const now = new Date();

      // Find HELD orders with expired holdUntil
      const expiredOrders = await app.prisma.order.findMany({
        where: {
          status: 'HELD',
          holdUntil: { lt: now, not: null },
        },
        include: {
          check: {
            select: {
              unitId: true,
              unit: { select: { slug: true } },
            },
          },
        },
      });

      for (const order of expiredOrders) {
        await app.prisma.order.update({
          where: { id: order.id },
          data: { status: 'PENDING', holdUntil: null },
        });

        publishKDSEvent(order.check.unitId, {
          event: 'order.released',
          timestamp: now.toISOString(),
          data: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            reason: 'Timer expired',
          },
        });
      }

      if (expiredOrders.length > 0) {
        app.log.info(
          { event: 'kds.hold_release_job', released: expiredOrders.length },
          `Released ${expiredOrders.length} held order(s)`,
        );
      }
    } catch (error) {
      app.log.error(
        { event: 'kds.hold_release_job_error', error },
        'Hold release job failed',
      );
    }
  }, INTERVAL_MS);

  app.addHook('onClose', () => {
    clearInterval(timer);
  });

  app.log.info('KDS hold-release job registered (every 60s)');
}
