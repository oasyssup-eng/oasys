import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { validateSession } from './session.service';

// ── Event Types ─────────────────────────────────────────────────────

export interface OrderEvent {
  event: string;
  orderId: string;
  orderNumber?: number | null;
  timestamp: string;
  data: Record<string, unknown>;
}

// ── In-Memory Pub/Sub ───────────────────────────────────────────────

const subscribers = new Map<string, Set<WebSocket>>();
const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const STALE_TIMEOUT = 90_000; // 90 seconds

/**
 * Publish an order event to all WebSocket subscribers for that order.
 * Called by menu.service, payment webhook, and KDS (future).
 */
export function publishOrderEvent(orderId: string, event: OrderEvent): void {
  const subs = subscribers.get(orderId);
  if (!subs) return;

  const message = JSON.stringify(event);

  for (const ws of subs) {
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(message);
    }
  }
}

function subscribe(orderId: string, ws: WebSocket): void {
  if (!subscribers.has(orderId)) {
    subscribers.set(orderId, new Set());
  }
  subscribers.get(orderId)!.add(ws);
}

function unsubscribe(orderId: string, ws: WebSocket): void {
  const subs = subscribers.get(orderId);
  if (subs) {
    subs.delete(ws);
    if (subs.size === 0) {
      subscribers.delete(orderId);
    }
  }
}

// ── WebSocket Route Registration ────────────────────────────────────

export async function registerOrderStatusWs(app: FastifyInstance): Promise<void> {
  app.get(
    '/ws/order-status',
    { websocket: true },
    (socket: WebSocket, _request) => {
      let subscribedOrderIds: string[] = [];
      let lastPong = Date.now();

      // Heartbeat: ping every 30s
      const heartbeat = setInterval(() => {
        if (Date.now() - lastPong > STALE_TIMEOUT) {
          // Client is stale, close connection
          cleanup();
          socket.close();
          return;
        }
        if (socket.readyState === 1) {
          socket.ping();
        }
      }, HEARTBEAT_INTERVAL);

      socket.on('pong', () => {
        lastPong = Date.now();
      });

      socket.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());

          if (msg.type === 'subscribe' && msg.sessionToken && msg.orderId) {
            // Validate session
            const session = validateSession(msg.sessionToken);
            if (!session) {
              socket.send(
                JSON.stringify({ error: 'Invalid session token' }),
              );
              return;
            }

            // Subscribe to order events
            subscribe(msg.orderId, socket);
            subscribedOrderIds.push(msg.orderId);

            socket.send(
              JSON.stringify({
                type: 'subscribed',
                orderId: msg.orderId,
              }),
            );
          }

          if (msg.type === 'unsubscribe' && msg.orderId) {
            unsubscribe(msg.orderId, socket);
            subscribedOrderIds = subscribedOrderIds.filter(
              (id) => id !== msg.orderId,
            );
          }
        } catch {
          socket.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      function cleanup() {
        clearInterval(heartbeat);
        for (const orderId of subscribedOrderIds) {
          unsubscribe(orderId, socket);
        }
      }

      socket.on('close', cleanup);
      socket.on('error', cleanup);
    },
  );
}

/** Get subscriber count (for monitoring/testing) */
export function getSubscriberCount(): number {
  let total = 0;
  for (const subs of subscribers.values()) {
    total += subs.size;
  }
  return total;
}

/** Clear all subscribers (for testing) */
export function clearAllSubscribers(): void {
  subscribers.clear();
}
