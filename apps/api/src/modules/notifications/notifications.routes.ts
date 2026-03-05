import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireRole } from '../../lib/auth';
import * as service from './notifications.service';

interface IdParams {
  Params: { id: string };
}

interface ListQuery {
  Querystring: { page?: string; limit?: string };
}

const staffRoles = ['WAITER', 'MANAGER', 'OWNER'] as const;

export async function notificationRoutes(app: FastifyInstance) {
  // GET /notifications
  app.get<ListQuery>(
    '/',
    { preHandler: requireRole([...staffRoles]) },
    async (request: FastifyRequest<ListQuery>, reply) => {
      const { unitId, employeeId } = request.user;
      const page = parseInt(request.query.page ?? '1', 10);
      const limit = parseInt(request.query.limit ?? '20', 10);
      const result = await service.listNotifications(
        app.prisma,
        unitId,
        employeeId,
        page,
        limit,
      );
      return reply.send(result);
    },
  );

  // POST /notifications/:id/read
  app.post<IdParams>(
    '/:id/read',
    { preHandler: requireRole([...staffRoles]) },
    async (request: FastifyRequest<IdParams>, reply) => {
      const { unitId } = request.user;
      const result = await service.markRead(
        app.prisma,
        request.params.id,
        unitId,
      );
      return reply.send(result);
    },
  );

  // POST /notifications/read-all
  app.post(
    '/read-all',
    { preHandler: requireRole([...staffRoles]) },
    async (request, reply) => {
      const { unitId, employeeId } = request.user;
      const result = await service.markAllRead(app.prisma, unitId, employeeId);
      return reply.send(result);
    },
  );
}
