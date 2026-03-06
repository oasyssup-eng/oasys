import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../lib/errors';
import { getSession, type SessionData } from './session.service';

// Augment FastifyRequest to include menuSession
declare module 'fastify' {
  interface FastifyRequest {
    menuSession: SessionData;
  }
}

/**
 * Fastify preHandler that validates X-Session-Token header
 * and populates request.menuSession with the session data.
 */
export function requireSession() {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const token = request.headers['x-session-token'] as string | undefined;

    if (!token) {
      throw AppError.unauthorized('Token de sessão não fornecido');
    }

    const session = getSession(token);
    request.menuSession = session;
  };
}
