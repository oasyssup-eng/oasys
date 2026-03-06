import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api } from '../lib/api';

export type TableColor = 'GREEN' | 'RED' | 'YELLOW' | 'STAR' | 'GRAY';

export interface TableStatus {
  id: string;
  number: number;
  label: string | null;
  seats: number;
  zoneId: string;
  zoneName: string;
  color: TableColor;
  isActive: boolean;
  hasServiceRequest: boolean;
  checkId: string | null;
  orderCount: number;
  hasReadyOrders: boolean;
}

export function useTableStatus() {
  const queryClient = useQueryClient();

  const query = useQuery<TableStatus[]>({
    queryKey: ['tables', 'status'],
    queryFn: async () => {
      const response = await api.get('/tables/status');
      return response.data as TableStatus[];
    },
    refetchInterval: 30_000,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['tables', 'status'] });
  }, [queryClient]);

  return { ...query, invalidate };
}

export interface TableSummary {
  id: string;
  number: number;
  zone: string;
  checkId: string | null;
  checkStatus: string | null;
  openedAt: string | null;
  openDuration: string | null;
  itemCount: number;
  orderCount: number;
  total: number;
  serviceFee: number;
  grossTotal: number;
  totalPaid: number;
  remainingBalance: number;
}

export function useTableSummary(tableId: string | undefined) {
  return useQuery<TableSummary>({
    queryKey: ['tables', tableId, 'summary'],
    queryFn: async () => {
      const response = await api.get(`/tables/${tableId}/summary`);
      return response.data as TableSummary;
    },
    enabled: !!tableId,
  });
}
