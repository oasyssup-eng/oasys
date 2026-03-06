import type { PrismaClient } from '@prisma/client';
import { AppError } from '../../lib/errors';
import type { SetRecipeInput } from './stock.schemas';

// ── Set Recipe (Full Replacement) ───────────────────────────────────

export async function setRecipe(
  prisma: PrismaClient,
  productId: string,
  unitId: string,
  input: SetRecipeInput,
) {
  // Verify product belongs to this unit
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: { select: { unitId: true } } },
  });

  if (!product || product.category.unitId !== unitId) {
    throw AppError.notFound('Produto não encontrado');
  }

  // Verify all stock items belong to this unit
  const stockItemIds = input.ingredients.map((i) => i.stockItemId);
  const stockItems = await prisma.stockItem.findMany({
    where: { id: { in: stockItemIds }, unitId },
  });

  if (stockItems.length !== stockItemIds.length) {
    throw AppError.badRequest('Um ou mais itens de estoque não foram encontrados');
  }

  // Check for duplicate stockItemIds in input
  const uniqueIds = new Set(stockItemIds);
  if (uniqueIds.size !== stockItemIds.length) {
    throw AppError.badRequest('Ingredientes duplicados na receita');
  }

  // Transaction: delete existing + create new
  await prisma.$transaction([
    prisma.productIngredient.deleteMany({
      where: { productId },
    }),
    ...input.ingredients.map((ingredient) =>
      prisma.productIngredient.create({
        data: {
          productId,
          stockItemId: ingredient.stockItemId,
          quantity: ingredient.quantity,
        },
      }),
    ),
  ]);

  return getRecipe(prisma, productId);
}

// ── Get Recipe ──────────────────────────────────────────────────────

export async function getRecipe(
  prisma: PrismaClient,
  productId: string,
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true },
  });

  if (!product) {
    throw AppError.notFound('Produto não encontrado');
  }

  const ingredients = await prisma.productIngredient.findMany({
    where: { productId },
    include: {
      stockItem: {
        select: { id: true, name: true, unitType: true, quantity: true, isActive: true },
      },
    },
  });

  return {
    productId: product.id,
    productName: product.name,
    ingredients: ingredients.map((i) => ({
      id: i.id,
      stockItemId: i.stockItem.id,
      stockItemName: i.stockItem.name,
      unitType: i.stockItem.unitType,
      quantityPerUnit: Number(i.quantity),
      currentStock: Number(i.stockItem.quantity),
      isActive: i.stockItem.isActive,
    })),
  };
}

// ── List Products With Recipes ──────────────────────────────────────

export async function listProductsWithRecipes(
  prisma: PrismaClient,
  unitId: string,
) {
  const products = await prisma.product.findMany({
    where: {
      category: { unitId },
      ingredients: { some: {} },
    },
    include: {
      ingredients: {
        include: {
          stockItem: { select: { name: true, unitType: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return products.map((p) => ({
    productId: p.id,
    productName: p.name,
    ingredientCount: p.ingredients.length,
    ingredients: p.ingredients.map((i) => ({
      stockItemName: i.stockItem.name,
      unitType: i.stockItem.unitType,
      quantityPerUnit: Number(i.quantity),
    })),
  }));
}

// ── List Products Without Recipes ───────────────────────────────────

export async function listProductsWithoutRecipes(
  prisma: PrismaClient,
  unitId: string,
) {
  const products = await prisma.product.findMany({
    where: {
      category: { unitId },
      ingredients: { none: {} },
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return products.map((p) => ({
    productId: p.id,
    productName: p.name,
  }));
}
