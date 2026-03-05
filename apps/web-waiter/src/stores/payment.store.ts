import { create } from 'zustand';
import { api } from '../lib/api';
import type { PaymentDTO, PaymentSummaryDTO } from '@oasys/shared';

interface PaymentStore {
  currentCheckId: string | null;
  summary: PaymentSummaryDTO | null;
  pendingPayment: PaymentDTO | null;
  isLoading: boolean;
  error: string | null;
  pollingInterval: ReturnType<typeof setInterval> | null;

  setCheckId: (checkId: string) => void;
  loadSummary: (checkId: string) => Promise<void>;
  createCashPayment: (
    amount: number,
    receivedAmount?: number,
  ) => Promise<PaymentDTO & { change: number }>;
  createPixPayment: (
    amount: number,
    customerName?: string,
  ) => Promise<PaymentDTO>;
  createCardPayment: (
    amount: number,
    customerName?: string,
  ) => Promise<PaymentDTO>;
  createCardPresentPayment: (
    amount: number,
    cardBrand?: string,
    isDebit?: boolean,
  ) => Promise<PaymentDTO>;
  pollPaymentStatus: (paymentId: string) => void;
  stopPolling: () => void;
  clearError: () => void;
}

export const usePaymentStore = create<PaymentStore>((set, get) => ({
  currentCheckId: null,
  summary: null,
  pendingPayment: null,
  isLoading: false,
  error: null,
  pollingInterval: null,

  setCheckId: (checkId) => set({ currentCheckId: checkId }),

  loadSummary: async (checkId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/payments/check/${checkId}/summary`);
      set({ summary: response.data, currentCheckId: checkId, isLoading: false });
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao carregar resumo';
      set({ error: message, isLoading: false });
    }
  },

  createCashPayment: async (amount, receivedAmount) => {
    const { currentCheckId } = get();
    if (!currentCheckId) throw new Error('No check selected');

    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/payments/cash', {
        checkId: currentCheckId,
        amount,
        receivedAmount,
      });
      await get().loadSummary(currentCheckId);
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao registrar pagamento';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  createPixPayment: async (amount, customerName) => {
    const { currentCheckId } = get();
    if (!currentCheckId) throw new Error('No check selected');

    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/payments/pix', {
        checkId: currentCheckId,
        amount,
        customerName,
      });
      const payment = response.data as PaymentDTO;
      set({ pendingPayment: payment, isLoading: false });
      get().pollPaymentStatus(payment.id);
      return payment;
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao gerar PIX';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  createCardPayment: async (amount, customerName) => {
    const { currentCheckId } = get();
    if (!currentCheckId) throw new Error('No check selected');

    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/payments/card', {
        checkId: currentCheckId,
        amount,
        customerName,
      });
      const payment = response.data as PaymentDTO;
      set({ pendingPayment: payment, isLoading: false });
      get().pollPaymentStatus(payment.id);
      return payment;
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao gerar link';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  createCardPresentPayment: async (amount, cardBrand, isDebit) => {
    const { currentCheckId } = get();
    if (!currentCheckId) throw new Error('No check selected');

    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/payments/card-present', {
        checkId: currentCheckId,
        amount,
        cardBrand,
        isDebit,
      });
      await get().loadSummary(currentCheckId);
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao registrar cartão';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  pollPaymentStatus: (paymentId) => {
    const { pollingInterval } = get();
    if (pollingInterval) clearInterval(pollingInterval);

    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/payments/${paymentId}`);
        const payment = response.data as PaymentDTO;

        if (payment.status === 'CONFIRMED') {
          get().stopPolling();
          set({ pendingPayment: null });
          const checkId = get().currentCheckId;
          if (checkId) await get().loadSummary(checkId);
        } else if (
          payment.status === 'FAILED' ||
          payment.status === 'CANCELLED'
        ) {
          get().stopPolling();
          set({ pendingPayment: null, error: 'Pagamento não confirmado' });
          const checkId = get().currentCheckId;
          if (checkId) await get().loadSummary(checkId);
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 3000);

    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) {
      clearInterval(pollingInterval);
      set({ pollingInterval: null });
    }
  },

  clearError: () => set({ error: null }),
}));
