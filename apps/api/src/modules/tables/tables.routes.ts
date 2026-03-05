import type { FastifyInstance } from 'fastify';
import { requireRole } from '../../lib/auth';
import * as service from './tables.service';

interface IdParams {
  Params: { id: string };
}

const staffRoles = ['WAITER', 'MANAGER', 'OWNER'] as const;

export async function tableRoutes(app: FastifyInstance) {
  // GET /tables/status
  app.get(
    '/status',
    { preHandler: requireRole([...staffRoles]) },
    async (request, reply) => {
      const { unitId } = request.user;
      const result = await service.getTableStatuses(app.prisma, unitId);
      return reply.send(result);
    },
  );

  // GET /tables/:id/summary
  app.get<IdParams>(
    '/:id/summary',
    { preHandler: requireRole(['WAITER', 'MANAGER']) },
    async (request, reply) => {
      const { unitId } = request.user;
      const result = await service.getTableSummary(
        app.prisma,
        request.params.id,
        unitId,
      );
      return reply.send(result);
    },
  );

  // POST /tables/:id/dismiss-request
  app.post<IdParams>(
    '/:id/dismiss-request',
    { preHandler: requireRole(['WAITER', 'MANAGER']) },
    async (request, reply) => {
      const { unitId } = request.user;
      const result = await service.dismissServiceRequest(
        app.prisma,
        request.params.id,
        unitId,
      );
      return reply.send(result);
    },
  );
}
