import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { loadConfig } from './lib/config';
import { prismaPlugin } from './lib/prisma';
import { authPlugin } from './lib/auth';
import { registerErrorHandler } from './lib/errors';
import { paymentRoutes } from './modules/payments/payments.routes';
import { cashRegisterRoutes } from './modules/cash-registers/cash-registers.routes';
import { menuRoutes } from './modules/menu/menu.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { checkRoutes } from './modules/checks/checks.routes';
import { orderRoutes } from './modules/orders/orders.routes';
import { tableRoutes } from './modules/tables/tables.routes';
import { notificationRoutes } from './modules/notifications/notifications.routes';
import { registerWaiterWs } from './modules/waiter/ws.handler';
import { registerPaymentExpirationJob } from './modules/payments/payment-expiration.job';
import { registerSessionCleanup } from './modules/menu/session.service';
import { kdsRoutes } from './modules/kds/kds.routes';
import { registerKDSWs } from './modules/kds/ws.handler';
import { registerHoldReleaseJob } from './modules/kds/hold-release.job';
import { fiscalRoutes } from './modules/fiscal/fiscal.routes';
import { registerFiscalRetryJob } from './modules/fiscal/retry.worker';
import { registerFiscalReconciliationJob } from './modules/fiscal/reconciliation.worker';

const config = loadConfig();

const server = Fastify({ logger: true });

// Plugins
server.register(cors, { origin: true });
server.register(websocket);
server.register(prismaPlugin);
server.register(authPlugin);

// Error handler
registerErrorHandler(server);

// Health check
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// API v1 routes
server.register(
  async (app) => {
    app.register(authRoutes, { prefix: '/auth' });
    app.register(paymentRoutes, { prefix: '/payments' });
    app.register(cashRegisterRoutes, { prefix: '/cash-registers' });
    app.register(menuRoutes, { prefix: '/menu' });
    app.register(checkRoutes, { prefix: '/checks' });
    app.register(orderRoutes, { prefix: '/orders' });
    app.register(tableRoutes, { prefix: '/tables' });
    app.register(notificationRoutes, { prefix: '/notifications' });
    app.register(kdsRoutes, { prefix: '/kds' });
    app.register(fiscalRoutes, { prefix: '/fiscal' });
    app.register(registerWaiterWs);
    app.register(registerKDSWs);
  },
  { prefix: '/api/v1' },
);

const start = async () => {
  try {
    await server.ready();
    registerPaymentExpirationJob(server);
    registerSessionCleanup(server);
    registerHoldReleaseJob(server);
    registerFiscalRetryJob(server);
    registerFiscalReconciliationJob(server);
    await server.listen({ port: config.API_PORT, host: config.API_HOST });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
