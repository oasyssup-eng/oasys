import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireRole } from '../../lib/auth';
import * as schemas from './dashboard.schemas';
import * as service from './dashboard.service';

export async function dashboardRoutes(app: FastifyInstance) {
  // GET /dashboard/today — Real-time KPIs
  app.get(
    '/today',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = schemas.dashboardTodayQuerySchema.parse(request.query);
      const result = await service.getDashboardToday(
        app.prisma,
        request.user.unitId,
        query.date,
      );
      return reply.send(result);
    },
  );

  // GET /dashboard/comparison — Compare with previous same weekday
  app.get(
    '/comparison',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = schemas.dashboardComparisonQuerySchema.parse(request.query);
      const result = await service.getDashboardComparison(
        app.prisma,
        request.user.unitId,
        query.date,
      );
      return reply.send(result);
    },
  );
}
