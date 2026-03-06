import { z } from 'zod';
import { cuidSchema } from './common.schema';

// ── Session ──────────────────────────────────────────────────────────

/** Query params for initiating a menu session */
export const initSessionQuerySchema = z
  .object({
    table: z.coerce.number().int().positive().optional(),
    mode: z.enum(['counter']).optional(),
    name: z.string().min(1).max(100).optional(),
  })
  .refine((data) => data.table !== undefined || data.mode === 'counter', {
    message: 'Either table number or mode=counter is required',
  });

// ── Products ─────────────────────────────────────────────────────────

/** Query params for filtering products */
export const menuProductsQuerySchema = z.object({
  category: cuidSchema.optional(),
  search: z.string().min(1).max(200).optional(),
  tags: z.string().max(500).optional(), // comma-separated
});

/** Query params for search endpoint */
export const menuSearchSchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters').max(200),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

// ── Orders ───────────────────────────────────────────────────────────

/** Schema for creating a menu order (customer-facing) */
export const createMenuOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: cuidSchema,
        quantity: z.number().int().positive('Quantity must be at least 1'),
        notes: z.string().max(500).optional(),
        modifiers: z
          .array(
            z.object({
              modifierId: cuidSchema,
              quantity: z.number().int().positive().default(1),
            }),
          )
          .optional(),
      }),
    )
    .min(1, 'Order must have at least one item'),
  customerName: z.string().min(1).max(100).optional(),
});

// ── Payment ──────────────────────────────────────────────────────────

/** Schema for initiating payment from web-menu (PRE_PAYMENT orders) */
export const menuPaymentSchema = z.object({
  method: z.enum(['PIX', 'CARD']),
  customerName: z.string().max(100).optional(),
  customerCpf: z.string().regex(/^\d{11}$/).optional(),
  customerEmail: z.string().email().optional(),
});
