import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireRole } from '../../lib/auth';
import * as schemas from './closing.schemas';
import * as service from './closing.service';
import { generateClosingCSV } from './export-csv';
import { generateClosingPDF } from './export-pdf';
import type { Divergence } from './reconciliation';

interface IdParams {
  Params: { id: string };
}

export async function closingRoutes(app: FastifyInstance) {
  // POST /closing/preflight — Pre-flight checks
  app.post(
    '/preflight',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await service.preflight(app.prisma, request.user.unitId);
      return reply.send(result);
    },
  );

  // POST /closing/execute — Execute day closing
  app.post(
    '/execute',
    { preHandler: requireRole(['OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const input = schemas.executeClosingSchema.parse(request.body);
      const result = await service.executeClosing(
        app.prisma,
        request.user.unitId,
        input,
        request.user.employeeId,
      );
      return reply.status(201).send(result);
    },
  );

  // POST /closing/:id/reopen — Reopen a closed day
  app.post<IdParams>(
    '/:id/reopen',
    { preHandler: requireRole(['OWNER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const input = schemas.reopenClosingSchema.parse(request.body);
      const result = await service.reopenClosing(
        app.prisma,
        request.params.id,
        request.user.unitId,
        input.reason,
        request.user.employeeId,
      );
      return reply.send(result);
    },
  );

  // GET /closing/current — Today's live consolidation
  app.get(
    '/current',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await service.getCurrentDay(
        app.prisma,
        request.user.unitId,
      );
      return reply.send(result);
    },
  );

  // GET /closing/history — Closing history
  app.get(
    '/history',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = schemas.closingHistoryQuerySchema.parse(request.query);
      const result = await service.getClosingHistory(
        app.prisma,
        request.user.unitId,
        query,
      );
      return reply.send(result);
    },
  );

  // GET /closing/:id — Closing detail
  app.get<IdParams>(
    '/:id',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const result = await service.getClosingDetail(
        app.prisma,
        request.params.id,
        request.user.unitId,
      );
      return reply.send(result);
    },
  );

  // GET /closing/:id/export/csv — CSV export
  app.get<IdParams>(
    '/:id/export/csv',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const report = await service.getClosingDetail(
        app.prisma,
        request.params.id,
        request.user.unitId,
      );

      const rawData = report.rawData as Record<string, unknown> | null;
      if (!rawData) {
        return reply.status(400).send({
          error: 'NO_DATA',
          message: 'Dados do fechamento não disponíveis para exportação',
        });
      }

      // Get unit name
      const unit = await app.prisma.unit.findUnique({
        where: { id: request.user.unitId },
        select: { name: true },
      });

      const csv = generateClosingCSV(
        {
          date: report.date,
          revenue: rawData.revenue as import('./consolidation').RevenueResult,
          paymentSummary: rawData.paymentSummary as import('./consolidation').PaymentSummary,
          hourlyData: rawData.hourlyData as import('./consolidation').HourlyRevenueEntry[],
          divergences: (rawData.reconciliation as { divergences: Divergence[] })?.divergences ?? [],
        },
        unit?.name ?? 'Unidade',
      );

      const dateStr = report.date.toISOString().split('T')[0];
      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="fechamento_${dateStr}.csv"`)
        .send(csv);
    },
  );

  // GET /closing/:id/export/pdf — PDF export
  app.get<IdParams>(
    '/:id/export/pdf',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest<IdParams>, reply: FastifyReply) => {
      const report = await service.getClosingDetail(
        app.prisma,
        request.params.id,
        request.user.unitId,
      );

      const rawData = report.rawData as Record<string, unknown> | null;
      if (!rawData) {
        return reply.status(400).send({
          error: 'NO_DATA',
          message: 'Dados do fechamento não disponíveis para exportação',
        });
      }

      const unit = await app.prisma.unit.findUnique({
        where: { id: request.user.unitId },
        select: {
          name: true,
          legalName: true,
          cnpj: true,
          streetAddress: true,
          addressNumber: true,
          city: true,
          state: true,
        },
      });

      const pdfBuffer = await generateClosingPDF(
        {
          date: report.date,
          revenue: rawData.revenue as import('./consolidation').RevenueResult,
          paymentSummary: rawData.paymentSummary as import('./consolidation').PaymentSummary,
          hourlyData: rawData.hourlyData as import('./consolidation').HourlyRevenueEntry[],
          operations: rawData.operations as import('./consolidation').OperationsSummary,
          divergences: (rawData.reconciliation as { divergences: Divergence[] })?.divergences ?? [],
        },
        {
          name: unit?.name ?? 'Unidade',
          legalName: unit?.legalName ?? null,
          cnpj: unit?.cnpj ?? null,
          streetAddress: unit?.streetAddress ?? null,
          addressNumber: unit?.addressNumber ?? null,
          city: unit?.city ?? null,
          state: unit?.state ?? null,
        },
      );

      const dateStr = report.date.toISOString().split('T')[0];
      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="fechamento_${dateStr}.pdf"`)
        .send(pdfBuffer);
    },
  );
}
