import { z } from 'zod';

export const loginSchema = z.object({
  pin: z.string().length(4, 'PIN deve ter 4 dígitos'),
  unitSlug: z.string().min(1, 'Slug da unidade é obrigatório'),
});

export type LoginInput = z.infer<typeof loginSchema>;
