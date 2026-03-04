import { useEffect, useRef, useState, useCallback } from 'react';
import type { OrderStatus } from '@oasys/shared';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/api/v1/menu';

interface OrderStatusEvent {
  event: string;
  orderId: string;
  orderNumber?: number;
  timestamp: string;
  data: Record<string, unknown>;
}

interface UseOrderStatusResult {
  status: OrderStatus | null;
  lastEvent: OrderStatusEvent | null;
  connected: boolean;
}

/**
 * Hook that subscribes to real-time order status updates via WebSocket.
 * Falls back to polling if WebSocket connection fails.
 */
export function useOrderStatus(
  orderId: string | undefined,
  sessionToken: string | null,
): UseOrderStatusResult {
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [lastEvent, setLastEvent] = useState<OrderStatusEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const maxRetries = 3;

  const connect = useCallback(() => {
    if (!orderId || !sessionToken) return;
    if (retriesRef.current >= maxRetries) return;

    try {
      const ws = new WebSocket(`${WS_BASE}/ws/order-status`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        retriesRef.current = 0;

        // Subscribe to order
        ws.send(
          JSON.stringify({
            type: 'subscribe',
            sessionToken,
            orderId,
          }),
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as OrderStatusEvent;
          if (data.event && data.orderId === orderId) {
            setLastEvent(data);

            // Map event to status
            const statusMap: Record<string, OrderStatus> = {
              'order.received': 'CONFIRMED',
              'order.preparing': 'PREPARING',
              'order.ready': 'READY',
              'order.delivered': 'DELIVERED',
            };

            const newStatus = statusMap[data.event];
            if (newStatus) {
              setStatus(newStatus);

              // Vibrate on READY
              if (newStatus === 'READY' && navigator.vibrate) {
                navigator.vibrate([200, 100, 200, 100, 200]);
              }
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;

        // Auto-reconnect with backoff
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
  }, [orderId, sessionToken]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { status, lastEvent, connected };
}
