import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireRole } from '../../lib/auth';
import {
  createStockItemSchema,
  updateStockItemSchema,
  stockItemIdParamSchema,
  stockItemQuerySchema,
  createMovementSchema,
  movementHistoryQuerySchema,
  cmvQuerySchema,
} from './stock.schemas';
import * as service from './stock.service';
import { calculateCMV } from './cmv.calculator';

interface IdParams {
  Params: { id: string };
}

export async function stockRoutes(app: FastifyInstance) {
  // POST /stock/items — Create stock item
  app.post(
    '/items',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createStockItemSchema.parse(request.body);
      const { unitId } = request.user;
      const result = await service.createStockItem(app.prisma, unitId, body);
      return reply.status(201).send(result);
    },
  );

  // GET /stock/items — List stock items
  app.get(
    '/items',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = stockItemQuerySchema.parse(request.query);
      const { unitId } = request.user;
      const result = await service.listStockItems(app.prisma, unitId, query);
      return reply.send(result);
    },
  );

  // GET /stock/items/:id — Get stock item detail
  app.get<IdParams>(
    '/items/:id',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request, reply) => {
      const { id } = stockItemIdParamSchema.parse(request.params);
      const { unitId } = request.user;
      const result = await service.getStockItem(app.prisma, id, unitId);
      return reply.send(result);
    },
  );

  // PUT /stock/items/:id — Update stock item
  app.put<IdParams>(
    '/items/:id',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request, reply) => {
      const { id } = stockItemIdParamSchema.parse(request.params);
      const body = updateStockItemSchema.parse(request.body);
      const { unitId } = request.user;
      const result = await service.updateStockItem(app.prisma, id, unitId, body);
      return reply.send(result);
    },
  );

  // DELETE /stock/items/:id — Deactivate stock item
  app.delete<IdParams>(
    '/items/:id',
    { preHandler: requireRole(['OWNER']) },
    async (request, reply) => {
      const { id } = stockItemIdParamSchema.parse(request.params);
      const { unitId } = request.user;
      const result = await service.deactivateStockItem(app.prisma, id, unitId);
      return reply.send(result);
    },
  );

  // POST /stock/movements — Create movement
  app.post(
    '/movements',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createMovementSchema.parse(request.body);
      const { unitId, employeeId } = request.user;
      const result = await service.createMovement(app.prisma, unitId, body, employeeId);
      return reply.status(201).send(result);
    },
  );

  // GET /stock/movements — List movements
  app.get(
    '/movements',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = movementHistoryQuerySchema.parse(request.query);
      const { unitId } = request.user;
      const result = await service.listMovements(app.prisma, unitId, query);
      return reply.send(result);
    },
  );

  // GET /stock/dashboard — Stock dashboard
  app.get(
    '/dashboard',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { unitId } = request.user;
      const result = await service.getStockDashboard(app.prisma, unitId);
      return reply.send(result);
    },
  );

  // GET /stock/cmv — CMV calculation
  app.get(
    '/cmv',
    { preHandler: requireRole(['OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = cmvQuerySchema.parse(request.query);
      const { unitId } = request.user;
      const result = await calculateCMV(app.prisma, unitId, query.startDate, query.endDate);
      return reply.send(result);
    },
  );

  // GET /stock/alerts — Stock alerts
  app.get(
    '/alerts',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { unitId } = request.user;
      const result = await service.listStockAlerts(app.prisma, unitId);
      return reply.send(result);
    },
  );

  // GET /stock/below-minimum — Items below minimum
  app.get(
    '/below-minimum',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { unitId } = request.user;
      const result = await service.listItemsBelowMinimum(app.prisma, unitId);
      return reply.send(result);
    },
  );
}
