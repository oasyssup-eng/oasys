import { z } from 'zod';
import { cuidSchema, cpfSchema } from './common.schema';

/** Schema for creating a cash payment */
export const createCashPaymentSchema = z.object({
  checkId: cuidSchema,
  amount: z.number().positive('Amount must be positive'),
  receivedAmount: z.number().positive().optional(),
});

/** Schema for creating a PIX payment (generates QR code via Pagar.me) */
export const createPixPaymentSchema = z.object({
  checkId: cuidSchema,
  amount: z.number().positive('Amount must be positive'),
  customerName: z.string().optional(),
  customerCpf: cpfSchema.optional(),
});

/** Schema for creating a card payment (generates payment link via Pagar.me) */
export const createCardPaymentSchema = z.object({
  checkId: cuidSchema,
  amount: z.number().positive('Amount must be positive'),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
});

/** Schema for registering a card-present payment (POS machine already processed) */
export const createCardPresentSchema = z.object({
  checkId: cuidSchema,
  amount: z.number().positive('Amount must be positive'),
  cardBrand: z.string().optional(),
  lastFourDigits: z.string().length(4).optional(),
  isDebit: z.boolean().default(false),
});
