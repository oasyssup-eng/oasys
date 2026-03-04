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
import { registerPaymentExpirationJob } from './modules/payments/payment-expiration.job';
import { registerSessionCleanup } from './modules/menu/session.service';

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
    app.register(paymentRoutes, { prefix: '/payments' });
    app.register(cashRegisterRoutes, { prefix: '/cash-registers' });
    app.register(menuRoutes, { prefix: '/menu' });
  },
  { prefix: '/api/v1' },
);

const start = async () => {
  try {
    await server.ready();
    registerPaymentExpirationJob(server);
    registerSessionCleanup(server);
    await server.listen({ port: config.API_PORT, host: config.API_HOST });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
