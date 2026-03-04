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

export interface CheckEvent {
  event: string;
  checkId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// ── In-Memory Pub/Sub ───────────────────────────────────────────────

const orderSubscribers = new Map<string, Set<WebSocket>>();
const checkSubscribers = new Map<string, Set<WebSocket>>();
const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const STALE_TIMEOUT = 90_000; // 90 seconds

// ── Order Events Pub/Sub ────────────────────────────────────────────

/**
 * Publish an order event to all WebSocket subscribers for that order.
 * Called by menu.service, payment webhook, and KDS (future).
 */
export function publishOrderEvent(orderId: string, event: OrderEvent): void {
  const subs = orderSubscribers.get(orderId);
  if (!subs) return;

  const message = JSON.stringify(event);

  for (const ws of subs) {
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(message);
    }
  }
}

function subscribeOrder(orderId: string, ws: WebSocket): void {
  if (!orderSubscribers.has(orderId)) {
    orderSubscribers.set(orderId, new Set());
  }
  orderSubscribers.get(orderId)!.add(ws);
}

function unsubscribeOrder(orderId: string, ws: WebSocket): void {
  const subs = orderSubscribers.get(orderId);
  if (subs) {
    subs.delete(ws);
    if (subs.size === 0) {
      orderSubscribers.delete(orderId);
    }
  }
}

// ── Check Events Pub/Sub ────────────────────────────────────────────

/**
 * Publish a check event to all WebSocket subscribers for that check.
 * Events: check.order_added, check.payment_received, check.updated, product.unavailable
 */
export function publishCheckEvent(checkId: string, event: CheckEvent): void {
  const subs = checkSubscribers.get(checkId);
  if (!subs) return;

  const message = JSON.stringify(event);

  for (const ws of subs) {
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(message);
    }
  }
}

function subscribeCheck(checkId: string, ws: WebSocket): void {
  if (!checkSubscribers.has(checkId)) {
    checkSubscribers.set(checkId, new Set());
  }
  checkSubscribers.get(checkId)!.add(ws);
}

function unsubscribeCheck(checkId: string, ws: WebSocket): void {
  const subs = checkSubscribers.get(checkId);
  if (subs) {
    subs.delete(ws);
    if (subs.size === 0) {
      checkSubscribers.delete(checkId);
    }
  }
}

// ── Common Heartbeat Setup ──────────────────────────────────────────

function setupHeartbeat(socket: WebSocket): { heartbeat: ReturnType<typeof setInterval> } {
  let lastPong = Date.now();

  const heartbeat = setInterval(() => {
    if (Date.now() - lastPong > STALE_TIMEOUT) {
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

  return { heartbeat };
}

// ── WebSocket Route Registration ────────────────────────────────────

export async function registerOrderStatusWs(app: FastifyInstance): Promise<void> {
  // ── Channel 1: Order Status ─────────────────────────────────────
  app.get(
    '/ws/order-status',
    { websocket: true },
    (socket: WebSocket, _request) => {
      let subscribedOrderIds: string[] = [];
      const { heartbeat } = setupHeartbeat(socket);

      socket.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());

          if (msg.type === 'subscribe' && msg.sessionToken && msg.orderId) {
            const session = validateSession(msg.sessionToken);
            if (!session) {
              socket.send(
                JSON.stringify({ error: 'Invalid session token' }),
              );
              return;
            }

            subscribeOrder(msg.orderId, socket);
            subscribedOrderIds.push(msg.orderId);

            socket.send(
              JSON.stringify({
                type: 'subscribed',
                orderId: msg.orderId,
              }),
            );
          }

          if (msg.type === 'unsubscribe' && msg.orderId) {
            unsubscribeOrder(msg.orderId, socket);
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
          unsubscribeOrder(orderId, socket);
        }
      }

      socket.on('close', cleanup);
      socket.on('error', cleanup);
    },
  );

  // ── Channel 2: Check Updates ────────────────────────────────────
  app.get(
    '/ws/check-updates',
    { websocket: true },
    (socket: WebSocket, _request) => {
      let subscribedCheckIds: string[] = [];
      const { heartbeat } = setupHeartbeat(socket);

      socket.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());

          if (msg.type === 'subscribe' && msg.sessionToken && msg.checkId) {
            const session = validateSession(msg.sessionToken);
            if (!session) {
              socket.send(
                JSON.stringify({ error: 'Invalid session token' }),
              );
              return;
            }

            subscribeCheck(msg.checkId, socket);
            subscribedCheckIds.push(msg.checkId);

            socket.send(
              JSON.stringify({
                type: 'subscribed',
                checkId: msg.checkId,
              }),
            );
          }

          if (msg.type === 'unsubscribe' && msg.checkId) {
            unsubscribeCheck(msg.checkId, socket);
            subscribedCheckIds = subscribedCheckIds.filter(
              (id) => id !== msg.checkId,
            );
          }
        } catch {
          socket.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      function cleanup() {
        clearInterval(heartbeat);
        for (const checkId of subscribedCheckIds) {
          unsubscribeCheck(checkId, socket);
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
  for (const subs of orderSubscribers.values()) {
    total += subs.size;
  }
  for (const subs of checkSubscribers.values()) {
    total += subs.size;
  }
  return total;
}

/** Clear all subscribers (for testing) */
export function clearAllSubscribers(): void {
  orderSubscribers.clear();
  checkSubscribers.clear();
}
