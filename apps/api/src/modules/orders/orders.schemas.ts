import { z } from 'zod';

export const deliverOrderSchema = z.object({
  notes: z.string().max(200).optional(),
});

export const partialDeliverSchema = z.object({
  deliveredItemIds: z.array(z.string()).min(1),
});

export type DeliverOrderInput = z.infer<typeof deliverOrderSchema>;
export type PartialDeliverInput = z.infer<typeof partialDeliverSchema>;
