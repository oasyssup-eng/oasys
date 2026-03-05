import type { PrismaClient, Prisma } from '@prisma/client';
import { checkAndDisableProducts } from './availability.service';

export interface DeductionResult {
  orderId: string;
  deducted: number;
  skipped: number;
  alerts: string[];
}

/**
 * Deducts stock for all items in an order based on product recipes (ficha técnica).
 * Fire-and-forget: this function should NEVER throw to prevent blocking order production.
 * If a product has no recipe, it is skipped silently.
 */
export async function deductStockForOrder(
  prisma: PrismaClient,
  orderId: string,
  unitId: string,
): Promise<DeductionResult> {
  const result: DeductionResult = {
    orderId,
    deducted: 0,
    skipped: 0,
    alerts: [],
  };

  // Fetch order items with quantities
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        select: {
          productId: true,
          quantity: true,
        },
      },
    },
  });

  if (!order || order.items.length === 0) {
    return result;
  }

  // Fetch all recipes for the products in this order
  const productIds = order.items.map((i) => i.productId);
  const allIngredients = await prisma.productIngredient.findMany({
    where: { productId: { in: productIds } },
    include: {
      stockItem: { select: { id: true, name: true, quantity: true, minQuantity: true, unitType: true, costPrice: true } },
    },
  });

  // Group ingredients by product
  const recipeMap = new Map<string, typeof allIngredients>();
  for (const ing of allIngredients) {
    const list = recipeMap.get(ing.productId) ?? [];
    list.push(ing);
    recipeMap.set(ing.productId, list);
  }

  // Aggregate total deductions per stock item
  const deductions = new Map<string, { quantity: number; stockItem: (typeof allIngredients)[0]['stockItem'] }>();

  for (const orderItem of order.items) {
    const recipe = recipeMap.get(orderItem.productId);
    if (!recipe || recipe.length === 0) {
      result.skipped++;
      continue;
    }

    for (const ingredient of recipe) {
      const deductQty = orderItem.quantity * Number(ingredient.quantity);
      const existing = deductions.get(ingredient.stockItemId);
      if (existing) {
        existing.quantity += deductQty;
      } else {
        deductions.set(ingredient.stockItemId, {
          quantity: deductQty,
          stockItem: ingredient.stockItem,
        });
      }
    }
  }

  // Execute deductions in a transaction
  if (deductions.size === 0) {
    return result;
  }

  const operations: Prisma.PrismaPromise<unknown>[] = [];
  const alertItems: { stockItemId: string; name: string; newQty: number; minQty: number | null; unitType: string }[] = [];

  for (const [stockItemId, { quantity: deductQty, stockItem }] of deductions) {
    const currentQty = Number(stockItem.quantity);
    const newQty = currentQty - deductQty;

    // Create OUT movement
    operations.push(
      prisma.stockMovement.create({
        data: {
          stockItemId,
          type: 'OUT',
          quantity: deductQty,
          reason: 'Dedução automática por venda',
          reference: orderId,
          costPrice: stockItem.costPrice,
        },
      }),
    );

    // Update stock quantity
    operations.push(
      prisma.stockItem.update({
        where: { id: stockItemId },
        data: { quantity: newQty },
      }),
    );

    result.deducted++;

    // Track items needing alerts
    const minQty = stockItem.minQuantity ? Number(stockItem.minQuantity) : null;
    if (minQty !== null && newQty <= minQty) {
      alertItems.push({
        stockItemId,
        name: stockItem.name,
        newQty,
        minQty,
        unitType: stockItem.unitType,
      });
    }
  }

  await prisma.$transaction(operations);

  // Create alerts outside transaction (non-critical)
  for (const item of alertItems) {
    try {
      const severity = item.newQty <= 0 ? 'CRITICAL' : 'WARNING';
      await prisma.alert.create({
        data: {
          unitId,
          type: 'LOW_STOCK',
          severity,
          message:
            item.newQty <= 0
              ? `Estoque zerado: ${item.name}`
              : `Estoque baixo: ${item.name} (${item.newQty.toFixed(1)} ${item.unitType})`,
          metadata: {
            stockItemId: item.stockItemId,
            stockItemName: item.name,
            currentQuantity: item.newQty,
            minQuantity: item.minQty,
            orderId,
          },
        },
      });
      result.alerts.push(item.name);
    } catch {
      // Alert creation failure should not propagate
    }
  }

  // Check product availability for depleted items
  for (const [stockItemId, { quantity: deductQty, stockItem }] of deductions) {
    const newQty = Number(stockItem.quantity) - deductQty;
    if (newQty <= 0) {
      try {
        await checkAndDisableProducts(prisma, stockItemId);
      } catch {
        // Availability check failure should not propagate
      }
    }
  }

  return result;
}
