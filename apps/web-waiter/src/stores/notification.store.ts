import { create } from 'zustand';
import { api } from '../lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  total: number;
  isLoading: boolean;
  error: string | null;

  loadNotifications: (page?: number) => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  clearError: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  total: 0,
  isLoading: false,
  error: null,

  loadNotifications: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/notifications', { params: { page, limit: 50 } });
      const data = response.data as {
        notifications: Notification[];
        unreadCount: number;
        total: number;
      };
      set({
        notifications: data.notifications,
        unreadCount: data.unreadCount,
        total: data.total,
        isLoading: false,
      });
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Erro ao carregar notificações';
      set({ error: message, isLoading: false });
    }
  },

  markRead: async (notificationId: string) => {
    try {
      await api.post(`/notifications/${notificationId}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // Silently ignore
    }
  },

  markAllRead: async () => {
    try {
      await api.post('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch {
      // Silently ignore
    }
  },

  addNotification: (notification: Notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
      total: state.total + 1,
    }));
  },

  clearError: () => set({ error: null }),
}));
