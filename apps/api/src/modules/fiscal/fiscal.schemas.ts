import { z } from 'zod';

// ── POST /fiscal/emit ─────────────────────────────────────────────
export const emitFiscalNoteSchema = z.object({
  checkId: z.string().cuid('Must be a valid CUID'),
  customerCpf: z
    .string()
    .regex(/^\d{11}$/, 'CPF must be exactly 11 digits')
    .optional(),
});
export type EmitFiscalNoteInput = z.infer<typeof emitFiscalNoteSchema>;

// ── POST /fiscal/notes/:id/cancel ─────────────────────────────────
export const cancelFiscalNoteSchema = z.object({
  justification: z
    .string()
    .min(15, 'Justificativa deve ter no minimo 15 caracteres')
    .max(255, 'Justificativa deve ter no maximo 255 caracteres'),
});
export type CancelFiscalNoteInput = z.infer<typeof cancelFiscalNoteSchema>;

// ── GET /fiscal/notes ─────────────────────────────────────────────
export const listFiscalNotesQuerySchema = z.object({
  status: z
    .enum(['PENDING', 'PROCESSING', 'AUTHORIZED', 'REJECTED', 'CANCELLED', 'ERROR'])
    .optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  checkId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListFiscalNotesQuery = z.infer<typeof listFiscalNotesQuerySchema>;

// ── GET /fiscal/report ────────────────────────────────────────────
export const fiscalReportQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});
export type FiscalReportQuery = z.infer<typeof fiscalReportQuerySchema>;

// ── Webhook query ─────────────────────────────────────────────────
export const webhookQuerySchema = z.object({
  token: z.string().min(1),
});
