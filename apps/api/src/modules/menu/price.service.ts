import type { PrismaClient } from '@oasys/database';

export interface PriceInfo {
  basePrice: number;
  effectivePrice: number;
  priceLabel: string | null;
}

/**
 * Resolve the effective price for a single product,
 * checking PriceSchedule for active happy-hour or promotional pricing.
 */
export async function resolvePrice(
  prisma: PrismaClient,
  productId: string,
  unitId: string,
  basePrice: number,
  timezone = 'America/Sao_Paulo',
): Promise<PriceInfo> {
  const { dayOfWeek, currentTime } = getCurrentTimeInfo(timezone);

  const schedule = await prisma.priceSchedule.findFirst({
    where: {
      productId,
      unitId,
      dayOfWeek,
      isActive: true,
      startTime: { lte: currentTime },
      endTime: { gte: currentTime },
    },
    select: {
      price: true,
      label: true,
    },
  });

  if (schedule) {
    return {
      basePrice,
      effectivePrice: Number(schedule.price),
      priceLabel: schedule.label,
    };
  }

  return {
    basePrice,
    effectivePrice: basePrice,
    priceLabel: null,
  };
}

/**
 * Batch resolve prices for multiple products.
 * Single DB query for all products' active schedules.
 * Returns a Map<productId, PriceInfo>.
 */
export async function resolvePricesBatch(
  prisma: PrismaClient,
  products: Array<{ id: string; price: number | unknown }>,
  unitId: string,
  timezone = 'America/Sao_Paulo',
): Promise<Map<string, PriceInfo>> {
  const result = new Map<string, PriceInfo>();
  const productIds = products.map((p) => p.id);

  if (productIds.length === 0) return result;

  const { dayOfWeek, currentTime } = getCurrentTimeInfo(timezone);

  // Single query for all active schedules
  const schedules = await prisma.priceSchedule.findMany({
    where: {
      productId: { in: productIds },
      unitId,
      dayOfWeek,
      isActive: true,
      startTime: { lte: currentTime },
      endTime: { gte: currentTime },
    },
    select: {
      productId: true,
      price: true,
      label: true,
    },
  });

  // Index schedules by productId
  const scheduleMap = new Map<string, { price: number; label: string | null }>();
  for (const s of schedules) {
    // Take the first matching schedule per product
    if (!scheduleMap.has(s.productId)) {
      scheduleMap.set(s.productId, {
        price: Number(s.price),
        label: s.label,
      });
    }
  }

  // Build result map
  for (const product of products) {
    const basePrice = Number(product.price);
    const schedule = scheduleMap.get(product.id);

    if (schedule) {
      result.set(product.id, {
        basePrice,
        effectivePrice: schedule.price,
        priceLabel: schedule.label,
      });
    } else {
      result.set(product.id, {
        basePrice,
        effectivePrice: basePrice,
        priceLabel: null,
      });
    }
  }

  return result;
}

// ── Helpers ──────────────────────────────────────────────────────────

function getCurrentTimeInfo(timezone: string): {
  dayOfWeek: number;
  currentTime: string;
} {
  const now = new Date();

  // Get day of week in timezone (0=Sun, 1=Mon, ... 6=Sat)
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  });
  const dayStr = dayFormatter.format(now);
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = dayMap[dayStr] ?? 0;

  // Get current time HH:mm in timezone
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = timeFormatter.formatToParts(now);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const currentTime = `${hour}:${minute}`;

  return { dayOfWeek, currentTime };
}
