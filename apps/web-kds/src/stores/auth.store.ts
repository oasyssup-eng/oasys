import { create } from 'zustand';
import { api } from '../lib/api';

interface AuthUser {
  employeeId: string;
  unitId: string;
  role: string;
  name: string;
}

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  login: (pin: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
}

const STORAGE_KEY = 'oasys_kds_token';

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  login: async (pin: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { pin });
      const { token, employee } = response.data;

      localStorage.setItem(STORAGE_KEY, token);
      set({
        token,
        user: {
          employeeId: employee.id,
          unitId: employee.unitId,
          role: employee.role,
          name: employee.name,
        },
        isLoading: false,
      });
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'PIN invalido';
      set({ error: message, isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, token: null });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]!));
        set({
          token,
          user: {
            employeeId: payload.employeeId,
            unitId: payload.unitId,
            role: payload.role,
            name: payload.name,
          },
        });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  },
}));
