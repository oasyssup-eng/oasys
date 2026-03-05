import type { PrismaClient } from '@oasys/database';
import type { FastifyInstance } from 'fastify';
import { AppError } from '../../lib/errors';
import type { LoginInput } from './auth.schemas';

export async function loginWithPin(
  prisma: PrismaClient,
  app: FastifyInstance,
  input: LoginInput,
) {
  // Find unit by slug (slug is unique within org, but we match any org here)
  const unit = await prisma.unit.findFirst({
    where: { slug: input.unitSlug },
    select: { id: true, name: true },
  });

  if (!unit) {
    throw AppError.unauthorized('Unidade não encontrada');
  }

  // Find employee by unitId + pin
  const employee = await prisma.employee.findUnique({
    where: { unitId_pin: { unitId: unit.id, pin: input.pin } },
    select: {
      id: true,
      name: true,
      role: true,
      unitId: true,
      isActive: true,
    },
  });

  if (!employee) {
    throw AppError.unauthorized('PIN inválido');
  }

  if (!employee.isActive) {
    throw AppError.unauthorized('Funcionário inativo');
  }

  // Sign JWT
  const token = app.jwt.sign({
    employeeId: employee.id,
    unitId: employee.unitId,
    role: employee.role,
    name: employee.name,
  });

  return {
    token,
    employee: {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      unitId: employee.unitId,
    },
  };
}
