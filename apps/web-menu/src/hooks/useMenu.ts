import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  MenuCategoryWithProductsDTO,
  MenuProductDetailDTO,
  MenuSearchResultDTO,
} from '@oasys/shared';

export function useCategories(slug: string) {
  return useQuery({
    queryKey: ['categories', slug],
    queryFn: () =>
      api.get<Array<{ id: string; name: string; sortOrder: number; productCount: number }>>(
        `/menu/${slug}/categories`,
      ),
    staleTime: 60_000,
  });
}

export function useProducts(slug: string, filters?: { category?: string; search?: string; tags?: string }) {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.tags) params.set('tags', filters.tags);
  const queryStr = params.toString();

  return useQuery({
    queryKey: ['products', slug, queryStr],
    queryFn: () =>
      api.get<{ categories: MenuCategoryWithProductsDTO[] }>(
        `/menu/${slug}/products${queryStr ? `?${queryStr}` : ''}`,
      ),
    staleTime: 60_000,
  });
}

export function useProductDetail(slug: string, productId: string | undefined) {
  return useQuery({
    queryKey: ['product', slug, productId],
    queryFn: () =>
      api.get<MenuProductDetailDTO>(`/menu/${slug}/products/${productId}`),
    enabled: !!productId,
  });
}

export function useSearchProducts(slug: string, query: string) {
  return useQuery({
    queryKey: ['search', slug, query],
    queryFn: () =>
      api.get<{ results: MenuSearchResultDTO[]; totalCount: number }>(
        `/menu/${slug}/search?q=${encodeURIComponent(query)}`,
      ),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}
