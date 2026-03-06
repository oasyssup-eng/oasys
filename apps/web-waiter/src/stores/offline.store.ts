import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

type OperationType = 'CREATE_ORDER' | 'DELIVER_ORDER' | 'CASH_PAYMENT';
type OperationStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

interface OfflineOperation {
  id: string;
  type: OperationType;
  payload: Record<string, unknown>;
  status: OperationStatus;
  retries: number;
  createdAt: string;
  error?: string;
}

interface OfflineStore {
  isOnline: boolean;
  operations: OfflineOperation[];

  setOnline: (online: boolean) => void;
  enqueue: (type: OperationType, payload: Record<string, unknown>) => void;
  processQueue: () => Promise<void>;
  removeOperation: (id: string) => void;
  clearSynced: () => void;
}

const MAX_RETRIES = 3;

export const useOfflineStore = create<OfflineStore>()(
  persist(
    (set, get) => ({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      operations: [],

      setOnline: (online: boolean) => {
        set({ isOnline: online });
        if (online) {
          void get().processQueue();
        }
      },

      enqueue: (type, payload) => {
        const op: OfflineOperation = {
          id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type,
          payload,
          status: 'PENDING',
          retries: 0,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          operations: [...state.operations, op],
        }));

        // Try to process immediately if online
        if (get().isOnline) {
          void get().processQueue();
        }
      },

      processQueue: async () => {
        const { operations, isOnline } = get();
        if (!isOnline) return;

        const pending = operations.filter(
          (op) => op.status === 'PENDING' || (op.status === 'FAILED' && op.retries < MAX_RETRIES),
        );

        for (const op of pending) {
          // Mark as syncing
          set((state) => ({
            operations: state.operations.map((o) =>
              o.id === op.id ? { ...o, status: 'SYNCING' as const } : o,
            ),
          }));

          try {
            await executeOperation(op);
            set((state) => ({
              operations: state.operations.map((o) =>
                o.id === op.id ? { ...o, status: 'SYNCED' as const } : o,
              ),
            }));
          } catch (err) {
            const message =
              (err as { response?: { data?: { message?: string } } }).response
                ?.data?.message ?? 'Erro ao sincronizar';
            set((state) => ({
              operations: state.operations.map((o) =>
                o.id === op.id
                  ? {
                      ...o,
                      status: 'FAILED' as const,
                      retries: o.retries + 1,
                      error: message,
                    }
                  : o,
              ),
            }));
          }
        }

        // Auto-clear synced operations
        get().clearSynced();
      },

      removeOperation: (id: string) => {
        set((state) => ({
          operations: state.operations.filter((o) => o.id !== id),
        }));
      },

      clearSynced: () => {
        set((state) => ({
          operations: state.operations.filter((o) => o.status !== 'SYNCED'),
        }));
      },
    }),
    {
      name: 'oasys-offline-queue',
      partialize: (state) => ({
        operations: state.operations.filter((o) => o.status !== 'SYNCED'),
      }),
    },
  ),
);

async function executeOperation(op: OfflineOperation): Promise<void> {
  switch (op.type) {
    case 'DELIVER_ORDER':
      await api.post(`/orders/${op.payload.orderId as string}/deliver`);
      break;
    case 'CASH_PAYMENT':
      await api.post('/payments/cash', op.payload);
      break;
    case 'CREATE_ORDER':
      // Future: POST /orders with order data
      await api.post('/orders', op.payload);
      break;
  }
}
