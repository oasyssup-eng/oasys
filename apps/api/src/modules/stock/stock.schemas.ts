import { z } from 'zod';

// ── Stock Item ────────────────────────────────────────────────────────

const UNIT_TYPES = ['UN', 'KG', 'L', 'ML', 'G', 'DOSE'] as const;

export const createStockItemSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  sku: z.string().max(50).optional(),
  unitType: z.enum(UNIT_TYPES, { invalid_type_error: 'Tipo de unidade inválido' }),
  quantity: z.number().min(0, 'Quantidade não pode ser negativa').default(0),
  minQuantity: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  supplierId: z.string().cuid().optional(),
});
export type CreateStockItemInput = z.infer<typeof createStockItemSchema>;

export const updateStockItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  sku: z.string().max(50).nullable().optional(),
  // unitType intentionally excluded — cannot be changed after creation (PRD-08 R2)
  minQuantity: z.number().min(0).nullable().optional(),
  costPrice: z.number().min(0).nullable().optional(),
  supplierId: z.string().cuid().nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateStockItemInput = z.infer<typeof updateStockItemSchema>;

export const stockItemIdParamSchema = z.object({
  id: z.string().min(1),
});

export const stockItemQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  belowMin: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type StockItemQuery = z.infer<typeof stockItemQuerySchema>;

// ── Movements ─────────────────────────────────────────────────────────

const MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUSTMENT', 'LOSS', 'TRANSFER'] as const;

export const createMovementSchema = z.object({
  stockItemId: z.string().cuid('ID do item inválido'),
  type: z.enum(MOVEMENT_TYPES, { invalid_type_error: 'Tipo de movimentação inválido' }),
  quantity: z.number().positive('Quantidade deve ser positiva'),
  reason: z.string().max(500).optional(),
  reference: z.string().max(255).optional(),
  costPrice: z.number().min(0).optional(),
});
export type CreateMovementInput = z.infer<typeof createMovementSchema>;

export const movementHistoryQuerySchema = z.object({
  stockItemId: z.string().cuid().optional(),
  type: z.enum(MOVEMENT_TYPES).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type MovementHistoryQuery = z.infer<typeof movementHistoryQuerySchema>;

// ── Recipes ───────────────────────────────────────────────────────────

export const recipeIngredientSchema = z.object({
  stockItemId: z.string().cuid('ID do item inválido'),
  quantity: z.number().positive('Quantidade deve ser positiva'),
});

export const setRecipeSchema = z.object({
  ingredients: z
    .array(recipeIngredientSchema)
    .min(1, 'Ao menos um ingrediente é obrigatório'),
});
export type SetRecipeInput = z.infer<typeof setRecipeSchema>;

export const productIdParamSchema = z.object({
  productId: z.string().min(1),
});

// ── CMV ───────────────────────────────────────────────────────────────

export const cmvQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
});
export type CMVQuery = z.infer<typeof cmvQuerySchema>;
