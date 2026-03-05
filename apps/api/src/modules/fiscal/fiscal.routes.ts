import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireRole } from '../../lib/auth';
import * as schemas from './fiscal.schemas';
import * as service from './fiscal.service';
import { handleFiscalCallback } from './callback.handler';

interface IdParams {
  Params: { id: string };
}

export async function fiscalRoutes(app: FastifyInstance) {
  // POST /fiscal/webhook — PUBLIC (token validation in handler)
  app.post(
    '/webhook',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await handleFiscalCallback(request, reply);
    },
  );

  // POST /fiscal/emit — Manually emit NFC-e for a check
  app.post(
    '/emit',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const input = schemas.emitFiscalNoteSchema.parse(request.body);
      const result = await service.emitNFCeForCheck(
        app.prisma,
        input.checkId,
        input.customerCpf,
      );
      return reply.send(result);
    },
  );

  // GET /fiscal/notes — List fiscal notes
  app.get(
    '/notes',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = schemas.listFiscalNotesQuerySchema.parse(request.query);
      const result = await service.listFiscalNotes(
        app.prisma,
        request.user.unitId,
        query,
      );
      return reply.send(result);
    },
  );

  // GET /fiscal/notes/:id — Get single fiscal note
  app.get<IdParams>(
    '/notes/:id',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const result = await service.getFiscalNoteById(
        app.prisma,
        request.params.id,
        request.user.unitId,
      );
      return reply.send(result);
    },
  );

  // POST /fiscal/notes/:id/cancel — Cancel fiscal note (OWNER only)
  app.post<IdParams>(
    '/notes/:id/cancel',
    { preHandler: requireRole(['OWNER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const input = schemas.cancelFiscalNoteSchema.parse(request.body);
      const result = await service.cancelFiscalNote(
        app.prisma,
        request.params.id,
        request.user.unitId,
        input.justification,
        request.user.employeeId,
      );
      return reply.send(result);
    },
  );

  // POST /fiscal/notes/:id/retry — Retry failed fiscal note
  app.post<IdParams>(
    '/notes/:id/retry',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const result = await service.retryFiscalNote(
        app.prisma,
        request.params.id,
        request.user.unitId,
      );
      return reply.send(result);
    },
  );

  // GET /fiscal/notes/:id/danfe — Redirect to DANFE URL
  app.get<IdParams>(
    '/notes/:id/danfe',
    { preHandler: requireRole(['WAITER', 'MANAGER', 'OWNER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const note = await service.getFiscalNoteById(
        app.prisma,
        request.params.id,
        request.user.unitId,
      );
      if (!note.danfeUrl) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'DANFE nao disponivel para esta nota',
        });
      }
      return reply.redirect(note.danfeUrl);
    },
  );

  // GET /fiscal/report — Fiscal divergence report
  app.get(
    '/report',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = schemas.fiscalReportQuerySchema.parse(request.query);
      const result = await service.getFiscalReport(
        app.prisma,
        request.user.unitId,
        query,
      );
      return reply.send(result);
    },
  );
}
