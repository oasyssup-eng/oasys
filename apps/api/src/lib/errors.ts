import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, code?: string) {
    return new AppError(400, message, code);
  }

  static unauthorized(message = 'Não autorizado') {
    return new AppError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Sem permissão') {
    return new AppError(403, message, 'FORBIDDEN');
  }

  static notFound(message = 'Recurso não encontrado') {
    return new AppError(404, message, 'NOT_FOUND');
  }

  static conflict(message: string) {
    return new AppError(409, message, 'CONFLICT');
  }

  static serviceUnavailable(message: string) {
    return new AppError(503, message, 'SERVICE_UNAVAILABLE');
  }

  static badGateway(message: string) {
    return new AppError(502, message, 'BAD_GATEWAY');
  }
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler(
    (error: Error, _request: FastifyRequest, reply: FastifyReply) => {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: error.code ?? 'APP_ERROR',
          message: error.message,
          details: error.details,
        });
      }

      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: error.flatten().fieldErrors,
        });
      }

      // Fastify validation errors (from schema option)
      if ('validation' in error && 'statusCode' in error) {
        const fastifyError = error as Error & { statusCode: number; validation: unknown };
        return reply.status(fastifyError.statusCode).send({
          error: 'VALIDATION_ERROR',
          message: error.message,
        });
      }

      app.log.error(error, 'Unhandled error');
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor',
      });
    },
  );
}
