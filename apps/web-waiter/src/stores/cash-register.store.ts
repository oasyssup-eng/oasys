import { create } from 'zustand';
import { api } from '../lib/api';
import type { CashRegisterDTO, CashRegisterOperationDTO } from '@oasys/shared';

interface CashRegisterWithOps extends CashRegisterDTO {
  operations: CashRegisterOperationDTO[];
}

interface CashRegisterStore {
  activeRegister: CashRegisterWithOps | null;
  isLoading: boolean;
  error: string | null;

  loadActive: () => Promise<void>;
  openRegister: (openingBalance: number) => Promise<void>;
  closeRegister: (
    closingBalance: number,
    closingNotes?: string,
  ) => Promise<unknown>;
  createOperation: (
    type: 'WITHDRAWAL' | 'SUPPLY' | 'ADJUSTMENT',
    amount: number,
    reason: string,
    authorizedBy?: string,
  ) => Promise<void>;
  clearError: () => void;
}

export const useCashRegisterStore = create<CashRegisterStore>((set, get) => ({
  activeRegister: null,
  isLoading: false,
  error: null,

  loadActive: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/cash-registers/active');
      set({ activeRegister: response.data, isLoading: false });
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response
        ?.status;
      if (status === 404) {
        set({ activeRegister: null, isLoading: false });
      } else {
        const message =
          (err as { response?: { data?: { message?: string } } }).response?.data
            ?.message ?? 'Erro ao carregar caixa';
        set({ error: message, isLoading: false });
      }
    }
  },

  openRegister: async (openingBalance) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/cash-registers/open', {
        openingBalance,
        type: 'OPERATOR',
      });
      set({ activeRegister: { ...response.data, operations: [] }, isLoading: false });
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao abrir caixa';
      set({ error: message, isLoading: false });
    }
  },

  closeRegister: async (closingBalance, closingNotes) => {
    const { activeRegister } = get();
    if (!activeRegister) return;

    set({ isLoading: true, error: null });
    try {
      const response = await api.post(
        `/cash-registers/${activeRegister.id}/close`,
        { closingBalance, closingNotes },
      );
      set({ activeRegister: null, isLoading: false });
      return response.data;
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao fechar caixa';
      set({ error: message, isLoading: false });
    }
  },

  createOperation: async (type, amount, reason, authorizedBy) => {
    const { activeRegister } = get();
    if (!activeRegister) return;

    set({ isLoading: true, error: null });
    try {
      await api.post(`/cash-registers/${activeRegister.id}/operation`, {
        type,
        amount,
        reason,
        authorizedBy,
      });
      await get().loadActive();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao registrar operação';
      set({ error: message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
