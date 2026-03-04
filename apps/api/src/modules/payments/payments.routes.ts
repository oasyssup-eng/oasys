import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireRole } from '../../lib/auth';
import {
  createCashPaymentSchema,
  createPixPaymentSchema,
  createCardPaymentSchema,
  createCardPresentSchema,
} from './payments.schemas';
import * as service from './payments.service';
import { handleWebhook } from './webhook.handler';

interface CheckIdParams {
  Params: { checkId: string };
}

interface IdParams {
  Params: { id: string };
}

export async function paymentRoutes(app: FastifyInstance) {
  // Public webhook (no auth — validated by HMAC signature)
  app.post('/webhook', {
    config: { rawBody: true },
    handler: handleWebhook,
  });

  // POST /payments/cash
  app.post(
    '/cash',
    { preHandler: requireRole(['WAITER', 'CASHIER', 'MANAGER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createCashPaymentSchema.parse(request.body);
      const { employeeId, unitId } = request.user;
      const result = await service.createCashPayment(
        app.prisma,
        body,
        employeeId,
        unitId,
      );
      return reply.status(200).send(result);
    },
  );

  // POST /payments/pix
  app.post(
    '/pix',
    { preHandler: requireRole(['WAITER', 'CASHIER', 'MANAGER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createPixPaymentSchema.parse(request.body);
      const { employeeId, unitId } = request.user;
      const result = await service.createPixPayment(
        app.prisma,
        body,
        employeeId,
        unitId,
      );
      return reply.status(201).send(result);
    },
  );

  // POST /payments/card
  app.post(
    '/card',
    { preHandler: requireRole(['WAITER', 'CASHIER', 'MANAGER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createCardPaymentSchema.parse(request.body);
      const { employeeId, unitId } = request.user;
      const result = await service.createCardPayment(
        app.prisma,
        body,
        employeeId,
        unitId,
      );
      return reply.status(201).send(result);
    },
  );

  // POST /payments/card-present
  app.post(
    '/card-present',
    { preHandler: requireRole(['WAITER', 'CASHIER', 'MANAGER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createCardPresentSchema.parse(request.body);
      const { employeeId, unitId } = request.user;
      const result = await service.createCardPresentPayment(
        app.prisma,
        body,
        employeeId,
        unitId,
      );
      return reply.status(200).send(result);
    },
  );

  // GET /payments/check/:checkId
  app.get<CheckIdParams>(
    '/check/:checkId',
    { preHandler: requireRole(['WAITER', 'CASHIER', 'MANAGER', 'OWNER']) },
    async (request, reply) => {
      const { unitId } = request.user;
      const result = await service.getPaymentsByCheck(
        app.prisma,
        request.params.checkId,
        unitId,
      );
      return reply.send(result);
    },
  );

  // GET /payments/check/:checkId/summary
  app.get<CheckIdParams>(
    '/check/:checkId/summary',
    { preHandler: requireRole(['WAITER', 'CASHIER', 'MANAGER', 'OWNER']) },
    async (request, reply) => {
      const { unitId } = request.user;
      const result = await service.getPaymentSummary(
        app.prisma,
        request.params.checkId,
        unitId,
      );
      return reply.send(result);
    },
  );

  // GET /payments/:id
  app.get<IdParams>(
    '/:id',
    { preHandler: requireRole(['WAITER', 'CASHIER', 'MANAGER', 'OWNER']) },
    async (request, reply) => {
      const { unitId } = request.user;
      const result = await service.getPaymentById(
        app.prisma,
        request.params.id,
        unitId,
      );
      return reply.send(result);
    },
  );

  // POST /payments/:id/refund
  app.post<IdParams>(
    '/:id/refund',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request, reply) => {
      const { unitId } = request.user;
      const result = await service.refundPayment(
        app.prisma,
        request.params.id,
        unitId,
      );
      return reply.send(result);
    },
  );
}
