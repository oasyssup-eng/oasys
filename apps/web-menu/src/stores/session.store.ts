import { create } from 'zustand';
import { api, setSessionToken, clearSessionToken } from '../lib/api';
import type { MenuSessionDTO, MenuUnitDTO, MenuSessionContext } from '@oasys/shared';

interface SessionState {
  sessionToken: string | null;
  unit: MenuUnitDTO | null;
  context: MenuSessionContext | null;
  isOpen: boolean;
  expiresAt: string | null;
  loading: boolean;
  error: string | null;

  initSession: (slug: string, params: { table?: number; mode?: string; name?: string }) => Promise<void>;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionToken: null,
  unit: null,
  context: null,
  isOpen: true,
  expiresAt: null,
  loading: false,
  error: null,

  initSession: async (slug, params) => {
    set({ loading: true, error: null });
    try {
      const query = new URLSearchParams();
      if (params.table) query.set('table', String(params.table));
      if (params.mode) query.set('mode', params.mode);
      if (params.name) query.set('name', params.name);

      const session = await api.get<MenuSessionDTO>(
        `/menu/${slug}/session?${query.toString()}`,
      );

      setSessionToken(session.sessionToken);

      set({
        sessionToken: session.sessionToken,
        unit: session.unit,
        context: session.context,
        isOpen: session.isOpen,
        expiresAt: session.expiresAt,
        loading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao iniciar sessão';
      set({ loading: false, error: message });
    }
  },

  clearSession: () => {
    clearSessionToken();
    set({
      sessionToken: null,
      unit: null,
      context: null,
      isOpen: true,
      expiresAt: null,
      error: null,
    });
  },
}));
