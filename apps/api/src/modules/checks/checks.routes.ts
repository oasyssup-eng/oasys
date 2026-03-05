import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireRole } from '../../lib/auth';
import {
  splitEqualSchema,
  splitByItemsSchema,
  splitCustomSchema,
  mergeChecksSchema,
  transferItemsSchema,
  applyDiscountSchema,
  updateServiceFeeSchema,
} from './checks.schemas';
import * as service from './checks.service';

interface IdParams {
  Params: { id: string };
}

const staffRoles = ['WAITER', 'MANAGER', 'OWNER'] as const;

export async function checkRoutes(app: FastifyInstance) {
  // GET /checks/:id/detail
  app.get<IdParams>(
    '/:id/detail',
    { preHandler: requireRole([...staffRoles]) },
    async (request, reply) => {
      const { unitId } = request.user;
      const result = await service.getCheckDetail(
        app.prisma,
        request.params.id,
        unitId,
      );
      return reply.send(result);
    },
  );

  // POST /checks/:id/split/equal
  app.post<IdParams>(
    '/:id/split/equal',
    { preHandler: requireRole(['WAITER', 'MANAGER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const body = splitEqualSchema.parse(request.body);
      const { unitId, employeeId } = request.user;
      const result = await service.splitEqual(
        app.prisma,
        request.params.id,
        unitId,
        employeeId,
        body,
      );
      return reply.status(201).send(result);
    },
  );

  // POST /checks/:id/split/by-items
  app.post<IdParams>(
    '/:id/split/by-items',
    { preHandler: requireRole(['WAITER', 'MANAGER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const body = splitByItemsSchema.parse(request.body);
      const { unitId, employeeId } = request.user;
      const result = await service.splitByItems(
        app.prisma,
        request.params.id,
        unitId,
        employeeId,
        body,
      );
      return reply.status(201).send(result);
    },
  );

  // POST /checks/:id/split/custom
  app.post<IdParams>(
    '/:id/split/custom',
    { preHandler: requireRole(['WAITER', 'MANAGER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const body = splitCustomSchema.parse(request.body);
      const { unitId, employeeId } = request.user;
      const result = await service.splitCustom(
        app.prisma,
        request.params.id,
        unitId,
        employeeId,
        body,
      );
      return reply.status(201).send(result);
    },
  );

  // POST /checks/:id/merge
  app.post<IdParams>(
    '/:id/merge',
    { preHandler: requireRole(['WAITER', 'MANAGER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const body = mergeChecksSchema.parse(request.body);
      const { unitId } = request.user;
      const result = await service.mergeChecks(
        app.prisma,
        request.params.id,
        unitId,
        body,
      );
      return reply.send(result);
    },
  );

  // POST /checks/:id/transfer-items
  app.post<IdParams>(
    '/:id/transfer-items',
    { preHandler: requireRole(['WAITER', 'MANAGER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const body = transferItemsSchema.parse(request.body);
      const { unitId } = request.user;
      const result = await service.transferItems(
        app.prisma,
        request.params.id,
        unitId,
        body,
      );
      return reply.send(result);
    },
  );

  // POST /checks/:id/discount
  app.post<IdParams>(
    '/:id/discount',
    { preHandler: requireRole(['WAITER', 'MANAGER', 'OWNER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const body = applyDiscountSchema.parse(request.body);
      const { unitId, employeeId } = request.user;
      const result = await service.applyDiscount(
        app.prisma,
        request.params.id,
        unitId,
        employeeId,
        body,
      );
      return reply.send(result);
    },
  );

  // PUT /checks/:id/service-fee
  app.put<IdParams>(
    '/:id/service-fee',
    { preHandler: requireRole(['WAITER', 'MANAGER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const body = updateServiceFeeSchema.parse(request.body);
      const { unitId } = request.user;
      const result = await service.updateServiceFee(
        app.prisma,
        request.params.id,
        unitId,
        body,
      );
      return reply.send(result);
    },
  );
}
