import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '../stores/session.store';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/api/v1/menu';

interface CheckUpdateEvent {
  event: string;
  checkId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Hook that subscribes to real-time check updates via WebSocket.
 * Automatically invalidates relevant queries when events arrive:
 * - check.order_added → invalidates orders + check queries
 * - check.payment_received → invalidates check query
 * - product.unavailable → invalidates products query
 */
export function useCheckUpdates(slug: string | undefined): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const maxRetries = 3;
  const queryClient = useQueryClient();

  const sessionToken = useSessionStore((s) => s.sessionToken);
  const checkId = useSessionStore((s) => s.context?.checkId);

  const connect = useCallback(() => {
    if (!checkId || !sessionToken || !slug) return;
    if (retriesRef.current >= maxRetries) return;

    try {
      const ws = new WebSocket(`${WS_BASE}/ws/check-updates`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        retriesRef.current = 0;

        ws.send(
          JSON.stringify({
            type: 'subscribe',
            sessionToken,
            checkId,
          }),
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as CheckUpdateEvent;

          // Invalidate relevant queries based on event type
          switch (data.event) {
            case 'check.order_added':
              queryClient.invalidateQueries({ queryKey: ['orders', slug] });
              queryClient.invalidateQueries({ queryKey: ['check', slug] });
              break;
            case 'check.payment_received':
            case 'check.updated':
              queryClient.invalidateQueries({ queryKey: ['check', slug] });
              break;
            case 'product.unavailable':
            case 'product.available':
            case 'price.updated':
              queryClient.invalidateQueries({ queryKey: ['products', slug] });
              queryClient.invalidateQueries({ queryKey: ['categories', slug] });
              break;
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;

        retriesRef.current++;
        if (retriesRef.current < maxRetries) {
          setTimeout(connect, 1000 * retriesRef.current);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setConnected(false);
    }
  }, [checkId, sessionToken, slug, queryClient]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { connected };
}
