import { z } from 'zod';
import { cuidSchema } from './common.schema';

/** Schema for an individual order item within a create order request */
const createOrderItemSchema = z.object({
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
});

/** Schema for creating a new order */
export const createOrderSchema = z.object({
  checkId: cuidSchema,
  courseType: z.enum(['STARTER', 'MAIN', 'DESSERT', 'DRINK']).optional(),
  source: z.enum(['WEB_MENU', 'WHATSAPP', 'WAITER', 'POS']).optional(),
  items: z
    .array(createOrderItemSchema)
    .min(1, 'Order must have at least one item'),
});

/** Schema for updating an order status */
export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'DELIVERED',
    'HELD',
    'CANCELLED',
  ]),
  holdUntil: z.string().datetime().optional(),
  cancellationReason: z.string().max(500).optional(),
});
