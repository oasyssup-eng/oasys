import { create } from 'zustand';

interface StockState {
  search: string;
  isActiveFilter: boolean;
  belowMinFilter: boolean;
  setSearch: (search: string) => void;
  setIsActiveFilter: (active: boolean) => void;
  setBelowMinFilter: (belowMin: boolean) => void;
  resetFilters: () => void;
}

export const useStockStore = create<StockState>((set) => ({
  search: '',
  isActiveFilter: true,
  belowMinFilter: false,
  setSearch: (search) => set({ search }),
  setIsActiveFilter: (isActiveFilter) => set({ isActiveFilter }),
  setBelowMinFilter: (belowMinFilter) => set({ belowMinFilter }),
  resetFilters: () => set({ search: '', isActiveFilter: true, belowMinFilter: false }),
}));
