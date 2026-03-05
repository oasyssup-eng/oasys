import { z } from 'zod';

// ── Station Enums ──────────────────────────────────────────────────
const StationEnum = z.enum(['BAR', 'KITCHEN', 'GRILL', 'DESSERT']);
const StationOrAllEnum = z.enum(['BAR', 'KITCHEN', 'GRILL', 'DESSERT', 'ALL']);

// ── GET /kds/queue ─────────────────────────────────────────────────
export const kdsQueueQuerySchema = z.object({
  station: StationOrAllEnum.default('ALL'),
  status: z.enum(['PENDING', 'PREPARING', 'HELD', 'ALL']).default('ALL'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type KDSQueueQuery = z.infer<typeof kdsQueueQuerySchema>;

// ── GET /kds/queue/ready ───────────────────────────────────────────
export const kdsReadyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ── POST /kds/orders/:id/bump ──────────────────────────────────────
export const bumpOrderSchema = z.object({
  station: StationEnum,
});
export type BumpOrderInput = z.infer<typeof bumpOrderSchema>;

// ── POST /kds/orders/:id/hold ──────────────────────────────────────
export const holdOrderSchema = z.object({
  reason: z.string().min(3).max(200),
  holdUntil: z.string().datetime().optional(),
});
export type HoldOrderInput = z.infer<typeof holdOrderSchema>;

// ── POST /kds/orders/:id/release ───────────────────────────────────
export const releaseOrderSchema = z.object({
  force: z.boolean().default(false),
});
export type ReleaseOrderInput = z.infer<typeof releaseOrderSchema>;

// ── POST /kds/orders/:id/courtesy ──────────────────────────────────
export const courtesySchema = z.object({
  reason: z.string().min(3).max(500),
  authorizedBy: z.string().cuid().optional(),
});
export type CourtesyInput = z.infer<typeof courtesySchema>;

// ── POST /kds/orders/:id/staff-meal ────────────────────────────────
export const staffMealSchema = z.object({
  employeeId: z.string().cuid(),
});
export type StaffMealInput = z.infer<typeof staffMealSchema>;

// ── GET /kds/pickup-board ──────────────────────────────────────────
export const pickupBoardQuerySchema = z.object({
  slug: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(30).default(20),
});
export type PickupBoardQuery = z.infer<typeof pickupBoardQuerySchema>;
