import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireRole } from '../../lib/auth';
import * as schemas from './kds.schemas';
import * as service from './kds.service';

interface IdParams {
  Params: { id: string };
}

export async function kdsRoutes(app: FastifyInstance) {
  // GET /kds/queue — Active queue filtered by station
  app.get(
    '/queue',
    { preHandler: requireRole(['BARTENDER', 'KITCHEN', 'MANAGER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = schemas.kdsQueueQuerySchema.parse(request.query);
      const result = await service.getQueue(app.prisma, request.user.unitId, query);
      return reply.send(result);
    },
  );

  // GET /kds/queue/ready — Ready orders awaiting pickup
  app.get(
    '/queue/ready',
    { preHandler: requireRole(['BARTENDER', 'KITCHEN', 'MANAGER', 'WAITER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = schemas.kdsReadyQuerySchema.parse(request.query);
      const result = await service.getReadyQueue(app.prisma, request.user.unitId, query.limit);
      return reply.send(result);
    },
  );

  // POST /kds/orders/:id/start — PENDING → PREPARING
  app.post<IdParams>(
    '/orders/:id/start',
    { preHandler: requireRole(['BARTENDER', 'KITCHEN', 'MANAGER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const result = await service.startOrder(
        app.prisma,
        request.params.id,
        request.user.unitId,
      );
      return reply.send(result);
    },
  );

  // POST /kds/orders/:id/bump — Station bump
  app.post<IdParams>(
    '/orders/:id/bump',
    { preHandler: requireRole(['BARTENDER', 'KITCHEN', 'MANAGER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const input = schemas.bumpOrderSchema.parse(request.body);
      const result = await service.bumpOrder(
        app.prisma,
        request.params.id,
        request.user.unitId,
        request.user.employeeId,
        input,
      );
      return reply.send(result);
    },
  );

  // POST /kds/orders/:id/hold — PENDING → HELD
  app.post<IdParams>(
    '/orders/:id/hold',
    { preHandler: requireRole(['BARTENDER', 'KITCHEN', 'MANAGER', 'WAITER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const input = schemas.holdOrderSchema.parse(request.body);
      const result = await service.holdOrder(
        app.prisma,
        request.params.id,
        request.user.unitId,
        input,
      );
      return reply.send(result);
    },
  );

  // POST /kds/orders/:id/release — HELD → PENDING
  app.post<IdParams>(
    '/orders/:id/release',
    { preHandler: requireRole(['BARTENDER', 'KITCHEN', 'MANAGER', 'WAITER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const input = schemas.releaseOrderSchema.parse(request.body);
      const result = await service.releaseOrder(
        app.prisma,
        request.params.id,
        request.user.unitId,
        input,
      );
      return reply.send(result);
    },
  );

  // POST /kds/orders/:id/recall — READY → PREPARING (Manager only)
  app.post<IdParams>(
    '/orders/:id/recall',
    { preHandler: requireRole(['MANAGER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const result = await service.recallOrder(
        app.prisma,
        request.params.id,
        request.user.unitId,
      );
      return reply.send(result);
    },
  );

  // GET /kds/stats — Operational statistics
  app.get(
    '/stats',
    { preHandler: requireRole(['BARTENDER', 'KITCHEN', 'MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await service.getStats(app.prisma, request.user.unitId);
      return reply.send(result);
    },
  );

  // POST /kds/orders/:id/courtesy — Mark as courtesy
  app.post<IdParams>(
    '/orders/:id/courtesy',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const input = schemas.courtesySchema.parse(request.body);
      const result = await service.markCourtesy(
        app.prisma,
        request.params.id,
        request.user.unitId,
        request.user.employeeId,
        input,
      );
      return reply.send(result);
    },
  );

  // POST /kds/orders/:id/staff-meal — Mark as staff meal
  app.post<IdParams>(
    '/orders/:id/staff-meal',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const input = schemas.staffMealSchema.parse(request.body);
      const result = await service.markStaffMeal(
        app.prisma,
        request.params.id,
        request.user.unitId,
        request.user.employeeId,
        input,
      );
      return reply.send(result);
    },
  );

  // GET /kds/pickup-board — PUBLIC (no auth)
  app.get(
    '/pickup-board',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = schemas.pickupBoardQuerySchema.parse(request.query);
      const result = await service.getPickupBoard(app.prisma, query.slug, query.limit);
      return reply.send(result);
    },
  );
}
