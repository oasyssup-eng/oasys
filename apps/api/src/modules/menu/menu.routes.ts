import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  initSessionQuerySchema,
  menuProductsQuerySchema,
  menuSearchSchema,
  createMenuOrderSchema,
  menuPaymentSchema,
} from '@oasys/shared';
import { requireSession } from './session.middleware';
import * as sessionService from './session.service';
import * as menuService from './menu.service';
import { registerOrderStatusWs } from './ws.handler';

// ── Route Type Helpers ──────────────────────────────────────────────

interface SlugParams {
  Params: { slug: string };
}

interface SlugIdParams {
  Params: { slug: string; id: string };
}

// ── Menu Routes ─────────────────────────────────────────────────────

export async function menuRoutes(app: FastifyInstance): Promise<void> {
  // ── Session (PUBLIC) ──────────────────────────────────────────────
  app.get<SlugParams>(
    '/:slug/session',
    async (request: FastifyRequest<SlugParams>, reply: FastifyReply) => {
      const query = request.query as Record<string, string>;
      const parsed = initSessionQuerySchema.parse({
        table: query.table ? Number(query.table) : undefined,
        mode: query.mode,
        name: query.name,
      });

      const session = await sessionService.createSession(
        app.prisma,
        request.params.slug,
        parsed,
      );

      return reply.status(200).send(session);
    },
  );

  // ── Categories (SESSION) ──────────────────────────────────────────
  app.get<SlugParams>(
    '/:slug/categories',
    { preHandler: requireSession() },
    async (request: FastifyRequest<SlugParams>, reply: FastifyReply) => {
      const categories = await menuService.getCategories(
        app.prisma,
        request.menuSession.unitId,
      );
      return reply.send(categories);
    },
  );

  // ── Products (SESSION) ────────────────────────────────────────────
  app.get<SlugParams>(
    '/:slug/products',
    { preHandler: requireSession() },
    async (request: FastifyRequest<SlugParams>, reply: FastifyReply) => {
      const query = request.query as Record<string, string>;
      const filters = menuProductsQuerySchema.parse({
        category: query.category,
        search: query.search,
        tags: query.tags,
      });

      const products = await menuService.getProducts(
        app.prisma,
        request.menuSession.unitId,
        filters,
      );
      return reply.send({ categories: products });
    },
  );

  // ── Product Detail (SESSION) ──────────────────────────────────────
  app.get<SlugIdParams>(
    '/:slug/products/:id',
    { preHandler: requireSession() },
    async (request: FastifyRequest<SlugIdParams>, reply: FastifyReply) => {
      const detail = await menuService.getProductDetail(
        app.prisma,
        request.params.id,
        request.menuSession.unitId,
      );
      return reply.send(detail);
    },
  );

  // ── Search (SESSION) ──────────────────────────────────────────────
  app.get<SlugParams>(
    '/:slug/search',
    { preHandler: requireSession() },
    async (request: FastifyRequest<SlugParams>, reply: FastifyReply) => {
      const query = request.query as Record<string, string>;
      const parsed = menuSearchSchema.parse({
        q: query.q,
        limit: query.limit ? Number(query.limit) : undefined,
      });

      const results = await menuService.searchProducts(
        app.prisma,
        request.menuSession.unitId,
        parsed.q,
        parsed.limit,
      );
      return reply.send(results);
    },
  );

  // ── Create Order (SESSION) ────────────────────────────────────────
  app.post<SlugParams>(
    '/:slug/orders',
    { preHandler: requireSession() },
    async (request: FastifyRequest<SlugParams>, reply: FastifyReply) => {
      const body = createMenuOrderSchema.parse(request.body);

      const order = await menuService.createMenuOrder(
        app.prisma,
        request.menuSession,
        body.items,
      );

      return reply.status(201).send(order);
    },
  );

  // ── List My Orders (SESSION) ──────────────────────────────────────
  app.get<SlugParams>(
    '/:slug/orders',
    { preHandler: requireSession() },
    async (request: FastifyRequest<SlugParams>, reply: FastifyReply) => {
      const orders = await menuService.getMyOrders(
        app.prisma,
        request.menuSession.checkId,
      );
      return reply.send(orders);
    },
  );

  // ── Get Order Detail (SESSION) ────────────────────────────────────
  app.get<SlugIdParams>(
    '/:slug/orders/:id',
    { preHandler: requireSession() },
    async (request: FastifyRequest<SlugIdParams>, reply: FastifyReply) => {
      const order = await menuService.getOrder(
        app.prisma,
        request.params.id,
        request.menuSession.checkId,
      );
      return reply.send(order);
    },
  );

  // ── Get Check Summary (SESSION) ───────────────────────────────────
  app.get<SlugParams>(
    '/:slug/check',
    { preHandler: requireSession() },
    async (request: FastifyRequest<SlugParams>, reply: FastifyReply) => {
      const summary = await menuService.getCheckSummary(
        app.prisma,
        request.menuSession.checkId,
        request.menuSession.unitId,
      );
      return reply.send(summary);
    },
  );

  // ── Initiate Payment for Order (SESSION, PRE_PAYMENT) ─────────────
  app.post<SlugIdParams>(
    '/:slug/orders/:id/pay',
    { preHandler: requireSession() },
    async (request: FastifyRequest<SlugIdParams>, reply: FastifyReply) => {
      const body = menuPaymentSchema.parse(request.body);

      const paymentInfo = await menuService.initiateOrderPayment(
        app.prisma,
        request.params.id,
        request.menuSession.checkId,
        request.menuSession.unitId,
        body,
      );

      // Delegate to payment service based on method
      // Import dynamically to avoid circular dependency
      const { createPixPayment, createCardPayment } = await import(
        '../payments/payments.service'
      );

      if (body.method === 'PIX') {
        const payment = await createPixPayment(
          app.prisma,
          {
            checkId: paymentInfo.checkId,
            amount: paymentInfo.orderTotal,
            customerName: body.customerName,
          },
          null, // No employeeId for customer-initiated
          paymentInfo.unitId,
        );
        return reply.status(201).send(payment);
      } else {
        const payment = await createCardPayment(
          app.prisma,
          {
            checkId: paymentInfo.checkId,
            amount: paymentInfo.orderTotal,
            customerName: body.customerName,
            customerEmail: body.customerEmail,
          },
          null, // No employeeId for customer-initiated
          paymentInfo.unitId,
        );
        return reply.status(201).send(payment);
      }
    },
  );

  // ── WebSocket — Order Status ──────────────────────────────────────
  await registerOrderStatusWs(app);
}
