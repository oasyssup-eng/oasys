import { z } from 'zod';
import { cuidSchema, cpfSchema } from './common.schema';

/** Schema for creating a cash payment */
export const createCashPaymentSchema = z.object({
  checkId: cuidSchema,
  amount: z.number().positive('Amount must be positive'),
  cashRegisterId: cuidSchema,
});

/** Schema for creating a PIX payment (generates QR code via Pagar.me) */
export const createPixPaymentSchema = z.object({
  checkId: cuidSchema,
  amount: z.number().positive('Amount must be positive'),
  customerCpf: cpfSchema.optional(),
});

/** Schema for creating a card payment (generates payment link via Pagar.me) */
export const createCardPaymentSchema = z.object({
  checkId: cuidSchema,
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['CREDIT_CARD', 'DEBIT_CARD']),
});
