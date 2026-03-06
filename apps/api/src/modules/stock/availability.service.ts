import type { PrismaClient } from '@prisma/client';

/**
 * Checks products that use this stock item as an ingredient.
 * If the stock item's quantity is <= 0, disables any products
 * that use it (sets isAvailable = false).
 */
export async function checkAndDisableProducts(
  prisma: PrismaClient,
  stockItemId: string,
) {
  const stockItem = await prisma.stockItem.findUnique({
    where: { id: stockItemId },
    select: { quantity: true },
  });

  if (!stockItem) return;

  const qty = Number(stockItem.quantity);
  if (qty > 0) return;

  // Find all products using this ingredient and disable them
  const ingredients = await prisma.productIngredient.findMany({
    where: { stockItemId },
    select: { productId: true },
  });

  if (ingredients.length === 0) return;

  const productIds = ingredients.map((i) => i.productId);

  await prisma.product.updateMany({
    where: { id: { in: productIds }, isAvailable: true },
    data: { isAvailable: false },
  });
}

/**
 * After an IN movement (replenishment), checks if all ingredients
 * for products that use this stock item are now > 0. If so,
 * restores isAvailable = true for those products.
 */
export async function checkAndRestoreProducts(
  prisma: PrismaClient,
  stockItemId: string,
) {
  // Find products using this ingredient that are currently disabled
  const ingredients = await prisma.productIngredient.findMany({
    where: { stockItemId },
    select: { productId: true },
  });

  if (ingredients.length === 0) return;

  const productIds = [...new Set(ingredients.map((i) => i.productId))];

  for (const productId of productIds) {
    // Check if ALL ingredients for this product have quantity > 0
    const allIngredients = await prisma.productIngredient.findMany({
      where: { productId },
      include: { stockItem: { select: { quantity: true, isActive: true } } },
    });

    const allAvailable = allIngredients.every(
      (ing) => ing.stockItem.isActive && Number(ing.stockItem.quantity) > 0,
    );

    if (allAvailable) {
      await prisma.product.update({
        where: { id: productId },
        data: { isAvailable: true },
      });
    }
  }
}
