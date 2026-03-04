import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Role } from '@oasys/shared';
import { getConfig } from './config';
import { AppError } from './errors';

export interface JwtPayload {
  employeeId: string;
  unitId: string;
  role: Role;
  name: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  const config = getConfig();
  app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: '12h' },
  });
});

export function requireAuth() {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      throw AppError.unauthorized('Token inválido ou expirado');
    }
  };
}

export function requireRole(roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth()(request, reply);
    const { role } = request.user;
    if (!roles.includes(role)) {
      throw AppError.forbidden(
        `Acesso restrito aos papéis: ${roles.join(', ')}`,
      );
    }
  };
}
