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

/**
 * Middleware that accepts either:
 * 1. Staff JWT with one of the specified roles, OR
 * 2. A check session header (X-Check-Session: checkId) for web-menu customers
 *
 * The session header contains the check ID. The middleware verifies the
 * check exists and is OPEN, then populates request.user with a synthetic
 * payload containing the unitId from the check.
 */
export function requireRoleOrCheckSession(roles: Role[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    const checkSession = request.headers['x-check-session'] as string | undefined;

    // Try JWT auth first if Authorization header present
    if (authHeader) {
      try {
        await request.jwtVerify();
        const { role } = request.user;
        if (roles.includes(role)) return;
      } catch {
        // JWT failed — fall through to check session
      }
    }

    // Try check session (checkId in header)
    if (checkSession) {
      const prisma = request.server.prisma;
      const check = await prisma.check.findUnique({
        where: { id: checkSession },
        select: { id: true, unitId: true, status: true },
      });

      if (check && (check.status === 'OPEN' || check.status === 'PAID')) {
        // Populate request.user with session-based identity
        (request as unknown as Record<string, unknown>).user = {
          employeeId: '',
          unitId: check.unitId,
          role: 'WAITER' as Role,
          name: 'Customer',
        } satisfies JwtPayload;
        return;
      }

      throw AppError.unauthorized('Sessão da conta inválida ou expirada');
    }

    throw AppError.unauthorized('Token inválido ou sessão não fornecida');
  };
}
