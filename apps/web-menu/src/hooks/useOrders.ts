import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  MenuOrderResponseDTO,
  MenuOrderDetailDTO,
  MenuCheckSummaryDTO,
} from '@oasys/shared';

export function useCreateOrder(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      items: Array<{
        productId: string;
        quantity: number;
        notes?: string;
        modifiers?: Array<{ modifierId: string; quantity: number }>;
      }>;
    }) => api.post<MenuOrderResponseDTO>(`/menu/${slug}/orders`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', slug] });
      queryClient.invalidateQueries({ queryKey: ['check', slug] });
    },
  });
}

export function useMyOrders(slug: string) {
  return useQuery({
    queryKey: ['orders', slug],
    queryFn: () => api.get<MenuOrderDetailDTO[]>(`/menu/${slug}/orders`),
    refetchInterval: 15_000, // Poll every 15s for status updates
  });
}

export function useOrderDetail(slug: string, orderId: string | undefined) {
  return useQuery({
    queryKey: ['order', slug, orderId],
    queryFn: () =>
      api.get<MenuOrderDetailDTO>(`/menu/${slug}/orders/${orderId}`),
    enabled: !!orderId,
    refetchInterval: 5_000, // Polling fallback for order status
  });
}

export function useCheckSummary(slug: string) {
  return useQuery({
    queryKey: ['check', slug],
    queryFn: () => api.get<MenuCheckSummaryDTO>(`/menu/${slug}/check`),
  });
}

export function useInitiatePayment(slug: string) {
  return useMutation({
    mutationFn: ({
      orderId,
      method,
      customerName,
      customerEmail,
    }: {
      orderId: string;
      method: 'PIX' | 'CARD';
      customerName?: string;
      customerEmail?: string;
    }) =>
      api.post(`/menu/${slug}/orders/${orderId}/pay`, {
        method,
        customerName,
        customerEmail,
      }),
  });
}
