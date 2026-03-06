import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useNotificationStore } from '../stores/notification.store';

const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:3001/api/v1/ws/waiter';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_DELAY = 30000;

export function useWaiterSocket(onTableUpdate?: () => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(RECONNECT_DELAY);
  const token = useAuthStore((s) => s.token);
  const addNotification = useNotificationStore((s) => s.addNotification);

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
          timestamp?: string;
        };

        // Skip auth confirmation
        if (msg.type === 'authenticated') return;

        // Handle events
        if (msg.event) {
          // Add as notification
          addNotification({
            id: `ws_${Date.now()}`,
            type: msg.event,
            title: getEventTitle(msg.event),
            message: getEventMessage(msg.event, msg.data),
            metadata: msg.data ?? null,
            isRead: false,
            createdAt: msg.timestamp ?? new Date().toISOString(),
          });

          // Trigger table refresh for table/order events
          if (
            msg.event.startsWith('table.') ||
            msg.event.startsWith('order.') ||
            msg.event.startsWith('check.')
          ) {
            onTableUpdate?.();
          }

          // Vibrate on high-priority events
          if (
            msg.event === 'order.ready' ||
            msg.event === 'table.service_request'
          ) {
            navigator.vibrate?.(200);
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
  }, [token, addNotification, onTableUpdate]);

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

function getEventTitle(event: string): string {
  switch (event) {
    case 'order.ready':
      return 'Pedido Pronto';
    case 'order.new_from_menu':
      return 'Novo Pedido (Cardapio)';
    case 'table.service_request':
      return 'Chamado de Mesa';
    case 'check.payment_received':
      return 'Pagamento Confirmado';
    case 'order.cancelled':
      return 'Pedido Cancelado';
    default:
      return 'Notificacao';
  }
}

function getEventMessage(
  event: string,
  data?: Record<string, unknown>,
): string {
  const table = data?.tableNumber ?? '';
  switch (event) {
    case 'order.ready':
      return `Mesa ${table} — pedido pronto para entrega`;
    case 'order.new_from_menu':
      return `Mesa ${table} fez pedido pelo cardapio`;
    case 'table.service_request':
      return `Mesa ${table} solicitou atendimento`;
    case 'check.payment_received':
      return `Pagamento confirmado — Mesa ${table}`;
    case 'order.cancelled':
      return `Pedido cancelado — Mesa ${table}`;
    default:
      return String(data?.message ?? 'Nova notificacao');
  }
}
