import { create } from 'zustand';
import { api } from '../lib/api';

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers: Record<string, unknown> | null;
  notes: string | null;
  isDelivered: boolean;
  product: { name: string };
}

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  source: string;
  createdAt: string;
  items: OrderItem[];
}

interface CheckPayment {
  id: string;
  method: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface CheckDetail {
  id: string;
  status: string;
  tableId: string;
  employeeId: string;
  splitParentId: string | null;
  openedAt: string;
  orders: Order[];
  payments: CheckPayment[];
  financials: {
    itemsTotal: number;
    serviceFee: number;
    discount: number;
    grossTotal: number;
    totalPaid: number;
    remainingBalance: number;
  };
  table: {
    id: string;
    number: number;
    zone: { name: string };
  };
  splitChildren: Array<{
    id: string;
    status: string;
    totalAmount: number;
  }>;
}

interface CheckStore {
  activeCheck: CheckDetail | null;
  isLoading: boolean;
  error: string | null;

  loadCheckDetail: (checkId: string) => Promise<void>;
  splitEqual: (checkId: string, numberOfPeople: number, includeServiceFee: boolean) => Promise<void>;
  splitByItems: (checkId: string, assignments: Array<{ label: string; itemIds: string[] }>) => Promise<void>;
  splitCustom: (checkId: string, amounts: Array<{ label: string; amount: number }>) => Promise<void>;
  mergeChecks: (targetCheckId: string, sourceCheckIds: string[]) => Promise<void>;
  transferItems: (checkId: string, targetCheckId: string, itemIds: string[]) => Promise<void>;
  applyDiscount: (checkId: string, type: 'PERCENTAGE' | 'FIXED', value: number, reason: string, authorizedBy?: string) => Promise<void>;
  updateServiceFee: (checkId: string, serviceFeeAmount: number) => Promise<void>;
  deliverOrder: (orderId: string) => Promise<void>;
  deliverPartial: (orderId: string, itemIds: string[]) => Promise<void>;
  clearCheck: () => void;
  clearError: () => void;
}

export const useCheckStore = create<CheckStore>((set, get) => ({
  activeCheck: null,
  isLoading: false,
  error: null,

  loadCheckDetail: async (checkId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/checks/${checkId}/detail`);
      set({ activeCheck: response.data as CheckDetail, isLoading: false });
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao carregar conta';
      set({ error: message, isLoading: false });
    }
  },

  splitEqual: async (checkId, numberOfPeople, includeServiceFee) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/checks/${checkId}/split/equal`, { numberOfPeople, includeServiceFee });
      await get().loadCheckDetail(checkId);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao dividir conta';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  splitByItems: async (checkId, assignments) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/checks/${checkId}/split/by-items`, { assignments });
      await get().loadCheckDetail(checkId);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao dividir conta';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  splitCustom: async (checkId, amounts) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/checks/${checkId}/split/custom`, { amounts });
      await get().loadCheckDetail(checkId);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao dividir conta';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  mergeChecks: async (targetCheckId, sourceCheckIds) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/checks/${targetCheckId}/merge`, { sourceCheckIds });
      await get().loadCheckDetail(targetCheckId);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao juntar contas';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  transferItems: async (checkId, targetCheckId, itemIds) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/checks/${checkId}/transfer-items`, { targetCheckId, itemIds });
      await get().loadCheckDetail(checkId);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao transferir itens';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  applyDiscount: async (checkId, type, value, reason, authorizedBy) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/checks/${checkId}/discount`, { type, value, reason, authorizedBy });
      await get().loadCheckDetail(checkId);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao aplicar desconto';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  updateServiceFee: async (checkId, serviceFeeAmount) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/checks/${checkId}/service-fee`, { serviceFeeAmount });
      await get().loadCheckDetail(checkId);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao atualizar taxa';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  deliverOrder: async (orderId) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/orders/${orderId}/deliver`);
      const check = get().activeCheck;
      if (check) await get().loadCheckDetail(check.id);
      else set({ isLoading: false });
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao confirmar entrega';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  deliverPartial: async (orderId, itemIds) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/orders/${orderId}/deliver/partial`, { itemIds });
      const check = get().activeCheck;
      if (check) await get().loadCheckDetail(check.id);
      else set({ isLoading: false });
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao confirmar entrega parcial';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  clearCheck: () => set({ activeCheck: null, error: null }),
  clearError: () => set({ error: null }),
}));
