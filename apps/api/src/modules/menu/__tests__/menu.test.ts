import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCategories,
  getProducts,
  getProductDetail,
  searchProducts,
} from '../menu.service';
import { resolvePricesBatch, resolvePrice } from '../price.service';

// Mock price.service
vi.mock('../price.service', () => ({
  resolvePricesBatch: vi.fn(),
  resolvePrice: vi.fn(),
}));

// Mock ws.handler (to avoid WebSocket side effects)
vi.mock('../ws.handler', () => ({
  publishOrderEvent: vi.fn(),
}));

// ── Mock Prisma ─────────────────────────────────────────────────────

function createMockPrisma() {
  return {
    category: {
      findMany: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    priceSchedule: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  } as unknown as Parameters<typeof getCategories>[0];
}

// ── Test Data ───────────────────────────────────────────────────────

const mockCategories = [
  {
    id: 'cat_001',
    name: 'Cervejas',
    sortOrder: 1,
    isActive: true,
    _count: { products: 3 },
  },
  {
    id: 'cat_002',
    name: 'Petiscos',
    sortOrder: 2,
    isActive: true,
    _count: { products: 5 },
  },
];

const mockProduct = {
  id: 'prod_001',
  unitId: 'unit_001',
  categoryId: 'cat_001',
  name: 'Chopp Pilsen 300ml',
  description: 'Chopp gelado direto da torneira',
  price: 12.9,
  isAvailable: true,
  sortOrder: 1,
  tags: '["gelado", "clássico"]',
  imageUrl: 'https://example.com/chopp.jpg',
  preparationTime: 1,
  station: 'BAR',
  modifierGroups: [
    {
      id: 'mg_001',
      name: 'Tamanho',
      min: 1,
      max: 1,
      sortOrder: 1,
      modifiers: [
        { id: 'mod_001', name: '300ml', price: 0, isAvailable: true, sortOrder: 1 },
        { id: 'mod_002', name: '500ml', price: 5, isAvailable: true, sortOrder: 2 },
      ],
    },
  ],
};

describe('Menu Service — Categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return active categories with product count', async () => {
    const prisma = createMockPrisma();
    (prisma.category.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockCategories);

    const result = await getCategories(prisma, 'unit_001');

    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe('Cervejas');
    expect(result[0]!.productCount).toBe(3);
    expect(result[1]!.name).toBe('Petiscos');
    expect(result[1]!.productCount).toBe(5);
  });

  it('should return categories sorted by sortOrder', async () => {
    const prisma = createMockPrisma();
    (prisma.category.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockCategories);

    const result = await getCategories(prisma, 'unit_001');

    expect(result[0]!.sortOrder).toBeLessThan(result[1]!.sortOrder);
  });

  it('should return empty array when no active categories', async () => {
    const prisma = createMockPrisma();
    (prisma.category.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getCategories(prisma, 'unit_001');
    expect(result).toEqual([]);
  });
});

describe('Menu Service — Products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return products grouped by category with effective prices', async () => {
    const prisma = createMockPrisma();
    const products = [
      {
        ...mockProduct,
        modifierGroups: [{ id: 'mg_001' }],
      },
    ];

    (prisma.category.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'cat_001',
        name: 'Cervejas',
        sortOrder: 1,
        products,
      },
    ]);

    const priceMap = new Map([
      ['prod_001', { basePrice: 12.9, effectivePrice: 9.9, priceLabel: 'Happy Hour' }],
    ]);
    (resolvePricesBatch as ReturnType<typeof vi.fn>).mockResolvedValue(priceMap);

    const result = await getProducts(prisma, 'unit_001');

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Cervejas');
    expect(result[0]!.products[0]!.effectivePrice).toBe(9.9);
    expect(result[0]!.products[0]!.priceLabel).toBe('Happy Hour');
    expect(result[0]!.products[0]!.hasModifiers).toBe(true);
  });

  it('should parse tags from JSON string', async () => {
    const prisma = createMockPrisma();
    (prisma.category.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'cat_001',
        name: 'Cervejas',
        sortOrder: 1,
        products: [{ ...mockProduct, modifierGroups: [] }],
      },
    ]);

    const priceMap = new Map([
      ['prod_001', { basePrice: 12.9, effectivePrice: 12.9, priceLabel: null }],
    ]);
    (resolvePricesBatch as ReturnType<typeof vi.fn>).mockResolvedValue(priceMap);

    const result = await getProducts(prisma, 'unit_001');
    expect(result[0]!.products[0]!.tags).toEqual(['gelado', 'clássico']);
  });

  it('should filter products by tags', async () => {
    const prisma = createMockPrisma();
    const product1 = { ...mockProduct, id: 'prod_001', tags: '["gelado"]', modifierGroups: [] };
    const product2 = { ...mockProduct, id: 'prod_002', name: 'Suco', tags: '["natural"]', modifierGroups: [] };

    (prisma.category.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'cat_001',
        name: 'Bebidas',
        sortOrder: 1,
        products: [product1, product2],
      },
    ]);

    const priceMap = new Map([
      ['prod_001', { basePrice: 12.9, effectivePrice: 12.9, priceLabel: null }],
      ['prod_002', { basePrice: 8.0, effectivePrice: 8.0, priceLabel: null }],
    ]);
    (resolvePricesBatch as ReturnType<typeof vi.fn>).mockResolvedValue(priceMap);

    const result = await getProducts(prisma, 'unit_001', { tags: 'natural' });
    expect(result[0]!.products).toHaveLength(1);
    expect(result[0]!.products[0]!.name).toBe('Suco');
  });

  it('should skip categories with no matching products', async () => {
    const prisma = createMockPrisma();
    (prisma.category.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'cat_001', name: 'Cervejas', sortOrder: 1, products: [] },
    ]);

    (resolvePricesBatch as ReturnType<typeof vi.fn>).mockResolvedValue(new Map());

    const result = await getProducts(prisma, 'unit_001');
    expect(result).toEqual([]);
  });
});

describe('Menu Service — Product Detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return product with modifier groups', async () => {
    const prisma = createMockPrisma();
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockProduct);
    (resolvePrice as ReturnType<typeof vi.fn>).mockResolvedValue({
      basePrice: 12.9,
      effectivePrice: 12.9,
      priceLabel: null,
    });

    const result = await getProductDetail(prisma, 'prod_001', 'unit_001');

    expect(result.name).toBe('Chopp Pilsen 300ml');
    expect(result.modifierGroups).toHaveLength(1);
    expect(result.modifierGroups[0]!.name).toBe('Tamanho');
    expect(result.modifierGroups[0]!.required).toBe(true); // min=1
    expect(result.modifierGroups[0]!.modifiers).toHaveLength(2);
  });

  it('should throw 404 for non-existent product', async () => {
    const prisma = createMockPrisma();
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      getProductDetail(prisma, 'prod_999', 'unit_001'),
    ).rejects.toThrow('Produto não encontrado');
  });

  it('should throw 404 for product from different unit', async () => {
    const prisma = createMockPrisma();
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockProduct,
      unitId: 'other_unit',
    });

    await expect(
      getProductDetail(prisma, 'prod_001', 'unit_001'),
    ).rejects.toThrow('Produto não encontrado');
  });

  it('should show happy hour price when active', async () => {
    const prisma = createMockPrisma();
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockProduct);
    (resolvePrice as ReturnType<typeof vi.fn>).mockResolvedValue({
      basePrice: 12.9,
      effectivePrice: 9.9,
      priceLabel: 'Happy Hour',
    });

    const result = await getProductDetail(prisma, 'prod_001', 'unit_001');
    expect(result.effectivePrice).toBe(9.9);
    expect(result.basePrice).toBe(12.9);
    expect(result.priceLabel).toBe('Happy Hour');
  });
});

describe('Menu Service — Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return matching products with category name', async () => {
    const prisma = createMockPrisma();
    const products = [
      {
        id: 'prod_001',
        name: 'Chopp Pilsen',
        price: 12.9,
        imageUrl: 'https://example.com/chopp.jpg',
        category: { name: 'Cervejas' },
      },
    ];

    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(products);
    (prisma.product.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

    const priceMap = new Map([
      ['prod_001', { basePrice: 12.9, effectivePrice: 12.9, priceLabel: null }],
    ]);
    (resolvePricesBatch as ReturnType<typeof vi.fn>).mockResolvedValue(priceMap);

    const result = await searchProducts(prisma, 'unit_001', 'chopp', 20);

    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.name).toBe('Chopp Pilsen');
    expect(result.results[0]!.categoryName).toBe('Cervejas');
    expect(result.totalCount).toBe(1);
  });

  it('should return empty results for no matches', async () => {
    const prisma = createMockPrisma();
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.product.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (resolvePricesBatch as ReturnType<typeof vi.fn>).mockResolvedValue(new Map());

    const result = await searchProducts(prisma, 'unit_001', 'xyz', 20);
    expect(result.results).toEqual([]);
    expect(result.totalCount).toBe(0);
  });
});
