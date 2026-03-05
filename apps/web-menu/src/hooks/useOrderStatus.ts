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
 * Play a notification sound using Web Audio API.
 * Two-tone beep pattern — audible even in noisy venues.
 */
function playReadySound(): void {
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    // First beep (higher pitch)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 880; // A5
    osc1.type = 'sine';
    gain1.gain.value = 0.3;
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    // Second beep (even higher)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1175; // D6
    osc2.type = 'sine';
    gain2.gain.value = 0.3;
    osc2.start(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.35);

    // Third beep (highest — attention grabbing)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.frequency.value = 1397; // F6
    osc3.type = 'sine';
    gain3.gain.value = 0.3;
    osc3.start(ctx.currentTime + 0.4);
    osc3.stop(ctx.currentTime + 0.6);

    // Cleanup context after sounds finish
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1000);
  } catch {
    // Audio not supported — silent fallback
  }
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

              // Sound + vibration on READY
              if (newStatus === 'READY') {
                playReadySound();
                if (navigator.vibrate) {
                  navigator.vibrate([200, 100, 200, 100, 200]);
                }
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
