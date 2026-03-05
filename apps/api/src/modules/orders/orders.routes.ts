import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireRole } from '../../lib/auth';
import { deliverOrderSchema, partialDeliverSchema } from './orders.schemas';
import * as service from './orders.service';

interface IdParams {
  Params: { id: string };
}

export async function orderRoutes(app: FastifyInstance) {
  // POST /orders/:id/deliver
  app.post<IdParams>(
    '/:id/deliver',
    { preHandler: requireRole(['WAITER', 'MANAGER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const body = deliverOrderSchema.parse(request.body ?? {});
      const { unitId, employeeId } = request.user;
      const result = await service.deliverOrder(
        app.prisma,
        request.params.id,
        unitId,
        employeeId,
        body,
      );
      return reply.send(result);
    },
  );

  // POST /orders/:id/deliver/partial
  app.post<IdParams>(
    '/:id/deliver/partial',
    { preHandler: requireRole(['WAITER', 'MANAGER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const body = partialDeliverSchema.parse(request.body);
      const { unitId, employeeId } = request.user;
      const result = await service.deliverPartial(
        app.prisma,
        request.params.id,
        unitId,
        employeeId,
        body,
      );
      return reply.send(result);
    },
  );
}
