import { z } from 'zod';

export { openCashRegisterSchema, closeCashRegisterSchema, createCashRegisterOperationSchema } from '@oasys/shared';

export const listCashRegistersQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  employeeId: z.string().cuid().optional(),
  status: z.enum(['OPEN', 'CLOSED', 'SUSPENDED']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
