import { z } from 'zod';

/** Schema for opening a cash register */
export const openCashRegisterSchema = z.object({
  openingBalance: z.number().min(0, 'Opening balance cannot be negative'),
  type: z.enum(['OPERATOR', 'DIGITAL']).default('OPERATOR'),
});

/** Schema for closing a cash register */
export const closeCashRegisterSchema = z.object({
  closingBalance: z.number().min(0, 'Closing balance cannot be negative'),
  closingNotes: z.string().max(500).optional(),
});

/** Schema for creating a cash register operation (withdrawal, supply, adjustment) */
export const createCashRegisterOperationSchema = z.object({
  type: z.enum(['WITHDRAWAL', 'SUPPLY', 'ADJUSTMENT']),
  amount: z.number().positive('Amount must be positive'),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500),
  authorizedBy: z.string().cuid().optional(),
});
