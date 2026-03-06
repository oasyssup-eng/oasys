import { z } from 'zod';

export const splitEqualSchema = z.object({
  numberOfPeople: z.number().int().min(2).max(20),
  includeServiceFee: z.boolean().default(true),
});

export const splitByItemsSchema = z.object({
  splits: z
    .array(
      z.object({
        label: z.string().max(50),
        items: z
          .array(
            z.object({
              orderItemId: z.string(),
              quantity: z.number().int().positive(),
            }),
          )
          .min(1),
      }),
    )
    .min(2),
  includeServiceFee: z.boolean().default(true),
});

export const splitCustomSchema = z.object({
  splits: z
    .array(
      z.object({
        label: z.string().max(50),
        amount: z.number().min(0),
      }),
    )
    .min(2),
});

export const mergeChecksSchema = z.object({
  sourceCheckIds: z.array(z.string()).min(1),
});

export const transferItemsSchema = z.object({
  targetCheckId: z.string(),
  items: z
    .array(
      z.object({
        orderItemId: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export const applyDiscountSchema = z.object({
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().positive(),
  reason: z.string().min(3).max(500),
  authorizedBy: z.string().optional(),
});

export const updateServiceFeeSchema = z.object({
  serviceFeeAmount: z.number().min(0),
});

export type SplitEqualInput = z.infer<typeof splitEqualSchema>;
export type SplitByItemsInput = z.infer<typeof splitByItemsSchema>;
export type SplitCustomInput = z.infer<typeof splitCustomSchema>;
export type MergeChecksInput = z.infer<typeof mergeChecksSchema>;
export type TransferItemsInput = z.infer<typeof transferItemsSchema>;
export type ApplyDiscountInput = z.infer<typeof applyDiscountSchema>;
export type UpdateServiceFeeInput = z.infer<typeof updateServiceFeeSchema>;
