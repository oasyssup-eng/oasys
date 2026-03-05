import { create } from 'zustand';

interface DashboardState {
  autoRefresh: boolean;
  refreshInterval: number; // ms
  toggleAutoRefresh: () => void;
  setRefreshInterval: (ms: number) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  autoRefresh: true,
  refreshInterval: 30_000, // 30s
  toggleAutoRefresh: () => set((s) => ({ autoRefresh: !s.autoRefresh })),
  setRefreshInterval: (ms: number) => set({ refreshInterval: ms }),
}));
