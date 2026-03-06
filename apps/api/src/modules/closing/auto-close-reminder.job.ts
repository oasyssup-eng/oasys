import type { FastifyInstance } from 'fastify';

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const REMINDER_HOUR = 4; // 4 AM

/**
 * Registers a recurring job that creates alerts for units that haven't
 * closed the previous day. Only checks at 4am to avoid spamming.
 */
export function registerAutoCloseReminderJob(app: FastifyInstance) {
  const timer = setInterval(async () => {
    try {
      const now = new Date();
      const currentHour = now.getHours();

      // Only run at the reminder hour
      if (currentHour !== REMINDER_HOUR) return;

      // Check for the previous day
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().split('T')[0]!;

      // Find all units
      const units = await app.prisma.unit.findMany({
        select: { id: true, name: true },
      });

      for (const unit of units) {
        // Check if there was any activity (paid checks) yesterday
        const hadActivity = await app.prisma.check.count({
          where: {
            unitId: unit.id,
            status: 'PAID',
            closedAt: {
              gte: new Date(`${yesterdayDate}T00:00:00.000Z`),
              lt: new Date(`${yesterdayDate}T23:59:59.999Z`),
            },
          },
        });

        if (hadActivity === 0) continue; // No activity → no need to close

        // Check if DailyReport exists
        const report = await app.prisma.dailyReport.findUnique({
          where: {
            unitId_date: {
              unitId: unit.id,
              date: new Date(yesterdayDate),
            },
          },
        });

        if (!report) {
          // Check if we already sent a reminder today
          const existingAlert = await app.prisma.alert.findFirst({
            where: {
              unitId: unit.id,
              type: 'SYSTEM',
              message: { contains: `[Fechamento] Dia ${yesterdayDate}` },
              createdAt: { gte: new Date(`${now.toISOString().split('T')[0]}T00:00:00.000Z`) },
            },
          });

          if (!existingAlert) {
            await app.prisma.alert.create({
              data: {
                unitId: unit.id,
                type: 'SYSTEM',
                severity: 'WARNING',
                message: `[Fechamento] Dia ${yesterdayDate} não foi fechado. ${hadActivity} conta(s) paga(s) aguardando fechamento.`,
              },
            });

            app.log.info(
              { unitId: unit.id, date: yesterdayDate },
              '[closing] Auto-close reminder sent',
            );
          }
        }
      }
    } catch (error) {
      app.log.error(
        { event: 'closing.auto_close_reminder_error', error },
        'Auto-close reminder job failed',
      );
    }
  }, INTERVAL_MS);

  app.addHook('onClose', () => {
    clearInterval(timer);
  });

  app.log.info('Auto-close reminder job registered (every 30min, checks at 4am)');
}
