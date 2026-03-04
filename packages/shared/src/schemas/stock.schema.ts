import { z } from 'zod';
import { cuidSchema } from './common.schema';

/** Schema for creating a stock movement */
export const createStockMovementSchema = z.object({
  stockItemId: cuidSchema,
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'LOSS', 'TRANSFER']),
  quantity: z.number().positive('Quantity must be positive'),
  reason: z.string().max(500).optional(),
  reference: z.string().max(255).optional(),
  costPrice: z.number().min(0).optional(),
});
