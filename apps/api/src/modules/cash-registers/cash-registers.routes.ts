import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireRole } from '../../lib/auth';
import {
  openCashRegisterSchema,
  closeCashRegisterSchema,
  createCashRegisterOperationSchema,
  listCashRegistersQuerySchema,
} from './cash-registers.schemas';
import * as service from './cash-registers.service';

interface IdParams {
  Params: { id: string };
}

export async function cashRegisterRoutes(app: FastifyInstance) {
  // POST /cash-registers/open
  app.post(
    '/open',
    { preHandler: requireRole(['CASHIER', 'MANAGER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = openCashRegisterSchema.parse(request.body);
      const { employeeId, unitId } = request.user;
      const result = await service.openCashRegister(
        app.prisma,
        body,
        employeeId,
        unitId,
      );
      return reply.status(201).send(result);
    },
  );

  // GET /cash-registers/active
  app.get(
    '/active',
    { preHandler: requireRole(['CASHIER', 'MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { employeeId, unitId } = request.user;
      const result = await service.getActiveCashRegister(
        app.prisma,
        employeeId,
        unitId,
      );
      if (!result) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Nenhum caixa aberto encontrado',
        });
      }
      return reply.send(result);
    },
  );

  // POST /cash-registers/:id/operation
  app.post<IdParams>(
    '/:id/operation',
    { preHandler: requireRole(['CASHIER', 'MANAGER']) },
    async (request, reply) => {
      const body = createCashRegisterOperationSchema.parse(request.body);
      const { employeeId, unitId } = request.user;
      const result = await service.createOperation(
        app.prisma,
        request.params.id,
        body,
        employeeId,
        unitId,
      );
      return reply.status(201).send(result);
    },
  );

  // POST /cash-registers/:id/close
  app.post<IdParams>(
    '/:id/close',
    { preHandler: requireRole(['CASHIER', 'MANAGER']) },
    async (request, reply) => {
      const body = closeCashRegisterSchema.parse(request.body);
      const { unitId } = request.user;
      const result = await service.closeCashRegister(
        app.prisma,
        request.params.id,
        body,
        unitId,
      );
      return reply.send(result);
    },
  );

  // GET /cash-registers/:id
  app.get<IdParams>(
    '/:id',
    { preHandler: requireRole(['CASHIER', 'MANAGER', 'OWNER']) },
    async (request, reply) => {
      const { unitId } = request.user;
      const result = await service.getCashRegisterById(
        app.prisma,
        request.params.id,
        unitId,
      );
      return reply.send(result);
    },
  );

  // GET /cash-registers
  app.get(
    '/',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listCashRegistersQuerySchema.parse(request.query);
      const { unitId } = request.user;
      const result = await service.listCashRegisters(
        app.prisma,
        unitId,
        query,
      );
      return reply.send(result);
    },
  );

  // GET /cash-registers/:id/report
  app.get<IdParams>(
    '/:id/report',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request, reply) => {
      const { unitId } = request.user;
      const result = await service.getCashRegisterReport(
        app.prisma,
        request.params.id,
        unitId,
      );
      return reply.send(result);
    },
  );
}
