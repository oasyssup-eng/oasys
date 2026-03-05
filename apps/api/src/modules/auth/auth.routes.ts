import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { loginSchema } from './auth.schemas';
import * as service from './auth.service';

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/login
  app.post(
    '/login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = loginSchema.parse(request.body);
      const result = await service.loginWithPin(app.prisma, app, body);
      return reply.status(200).send(result);
    },
  );
}
