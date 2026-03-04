import { z } from 'zod';
import { cuidSchema } from './common.schema';

/** Schema for opening a cash register */
export const openCashRegisterSchema = z.object({
  unitId: cuidSchema,
  type: z.enum(['OPERATOR', 'DIGITAL']),
  openingBalance: z.number().min(0, 'Opening balance cannot be negative'),
});

/** Schema for closing a cash register */
export const closeCashRegisterSchema = z.object({
  closingBalance: z.number().min(0, 'Closing balance cannot be negative'),
  closingNotes: z.string().max(500).optional(),
});

/** Schema for creating a cash register operation (withdrawal, supply, adjustment) */
export const createCashRegisterOperationSchema = z.object({
  cashRegisterId: cuidSchema,
  type: z.enum(['WITHDRAWAL', 'SUPPLY', 'ADJUSTMENT']),
  amount: z.number().positive('Amount must be positive'),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500),
  authorizedBy: cuidSchema.optional(),
});
