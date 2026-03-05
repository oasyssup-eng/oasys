import { create } from 'zustand';
import { api } from '../lib/api';

// ── Types ────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  station: string | null;
  isThisStation: boolean;
  modifiers: unknown;
  notes: string | null;
}

interface KDSOrder {
  id: string;
  orderNumber: number | null;
  status: string;
  source: string;
  courseType: string | null;
  tableNumber: number | null;
  zoneName: string | null;
  createdAt: string;
  elapsedSeconds: number;
  isHeld: boolean;
  holdUntil: string | null;
  items: OrderItem[];
  stationProgress: Record<string, boolean>;
  priority: string;
}

interface ReadyOrder {
  id: string;
  orderNumber: number | null;
  status: string;
  source: string;
  tableNumber: number | null;
  readyAt: string;
  items: Array<{ productName: string; quantity: number }>;
}

interface StationBreakdown {
  orderItems: number;
  totalQuantity: number;
}

interface TopProduct {
  productId: string;
  productName: string;
  station: string | null;
  totalQuantity: number;
}

interface KDSStats {
  period: string;
  overall: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    courtesyOrders: number;
    staffMeals: number;
    avgPrepTimeSeconds: number;
    currentQueueLength: number;
    currentHeldOrders: number;
  };
  byStation: Record<string, StationBreakdown>;
  topProducts: TopProduct[];
}

type Station = 'BAR' | 'KITCHEN' | 'GRILL' | 'DESSERT' | 'ALL';

interface KDSStore {
  station: Station;
  orders: KDSOrder[];
  heldOrders: KDSOrder[];
  readyOrders: ReadyOrder[];
  avgPrepTime: number;
  queueLength: number;
  isLoading: boolean;
  error: string | null;
  stats: KDSStats | null;

  setStation: (station: Station) => void;
  loadQueue: () => Promise<void>;
  loadReadyQueue: () => Promise<void>;
  loadStats: () => Promise<void>;
  bumpOrder: (orderId: string, station: string) => Promise<void>;
  holdOrder: (orderId: string, reason: string, holdUntil?: string) => Promise<void>;
  releaseOrder: (orderId: string) => Promise<void>;
  recallOrder: (orderId: string) => Promise<void>;
  startOrder: (orderId: string) => Promise<void>;
  markCourtesy: (orderId: string, reason: string, authorizedBy?: string) => Promise<void>;
  markStaffMeal: (orderId: string, employeeId: string) => Promise<void>;
  updateFromWS: (event: string, data: Record<string, unknown>) => void;
}

export const useKDSStore = create<KDSStore>((set, get) => ({
  station: 'ALL',
  orders: [],
  heldOrders: [],
  readyOrders: [],
  avgPrepTime: 0,
  queueLength: 0,
  isLoading: false,
  error: null,
  stats: null,

  setStation: (station) => {
    set({ station });
    get().loadQueue();
  },

  loadQueue: async () => {
    try {
      set({ isLoading: true, error: null });
      const { station } = get();
      const res = await api.get('/kds/queue', { params: { station, status: 'ALL', limit: 50 } });
      set({
        orders: res.data.orders,
        heldOrders: res.data.heldOrders,
        avgPrepTime: res.data.avgPrepTime,
        queueLength: res.data.queueLength,
        isLoading: false,
      });
    } catch {
      set({ error: 'Erro ao carregar fila', isLoading: false });
    }
  },

  loadReadyQueue: async () => {
    try {
      const res = await api.get('/kds/queue/ready', { params: { limit: 50 } });
      set({ readyOrders: res.data.orders });
    } catch {
      // silent
    }
  },

  loadStats: async () => {
    try {
      const res = await api.get('/kds/stats');
      set({ stats: res.data });
    } catch {
      // silent
    }
  },

  bumpOrder: async (orderId, station) => {
    try {
      await api.post(`/kds/orders/${orderId}/bump`, { station });
      get().loadQueue();
      get().loadReadyQueue();
    } catch {
      set({ error: 'Erro ao finalizar estacao' });
    }
  },

  holdOrder: async (orderId, reason, holdUntil) => {
    try {
      await api.post(`/kds/orders/${orderId}/hold`, { reason, holdUntil });
      get().loadQueue();
    } catch {
      set({ error: 'Erro ao reter pedido' });
    }
  },

  releaseOrder: async (orderId) => {
    try {
      await api.post(`/kds/orders/${orderId}/release`, { force: false });
      get().loadQueue();
    } catch {
      set({ error: 'Erro ao liberar pedido' });
    }
  },

  recallOrder: async (orderId) => {
    try {
      await api.post(`/kds/orders/${orderId}/recall`);
      get().loadQueue();
      get().loadReadyQueue();
    } catch {
      set({ error: 'Erro ao retornar pedido' });
    }
  },

  startOrder: async (orderId) => {
    try {
      await api.post(`/kds/orders/${orderId}/start`);
      get().loadQueue();
    } catch {
      set({ error: 'Erro ao iniciar pedido' });
    }
  },

  markCourtesy: async (orderId, reason, authorizedBy) => {
    try {
      await api.post(`/kds/orders/${orderId}/courtesy`, { reason, authorizedBy });
      get().loadQueue();
    } catch {
      set({ error: 'Erro ao marcar cortesia' });
    }
  },

  markStaffMeal: async (orderId, employeeId) => {
    try {
      await api.post(`/kds/orders/${orderId}/staff-meal`, { employeeId });
      get().loadQueue();
    } catch {
      set({ error: 'Erro ao marcar consumo interno' });
    }
  },

  updateFromWS: (_event, _data) => {
    // Re-fetch on any KDS event
    get().loadQueue();
    get().loadReadyQueue();
  },
}));
