import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useKDSStore } from '../stores/kds.store';
import { useSoundStore } from '../stores/sound.store';

const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:3001/api/v1/ws/kds';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_DELAY = 30000;

export function useKDSSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(RECONNECT_DELAY);
  const token = useAuthStore((s) => s.token);
  const updateFromWS = useKDSStore((s) => s.updateFromWS);
  const playNewOrder = useSoundStore((s) => s.playNewOrder);

  const connect = useCallback(() => {
    if (!token) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelay.current = RECONNECT_DELAY;
      ws.send(JSON.stringify({ type: 'authenticate', token }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          type?: string;
          event?: string;
          data?: Record<string, unknown>;
        };

        if (msg.type === 'authenticated') return;

        if (msg.event) {
          updateFromWS(msg.event, msg.data ?? {});

          if (msg.event === 'order.new') {
            playNewOrder();
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [token, updateFromWS, playNewOrder]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    reconnectTimer.current = setTimeout(() => {
      connect();
      reconnectDelay.current = Math.min(
        reconnectDelay.current * 2,
        MAX_RECONNECT_DELAY,
      );
    }, reconnectDelay.current);
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);
}
