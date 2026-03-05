import { z } from 'zod';

export const dashboardTodayQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type DashboardTodayQuery = z.infer<typeof dashboardTodayQuerySchema>;

export const dashboardComparisonQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type DashboardComparisonQuery = z.infer<typeof dashboardComparisonQuerySchema>;
