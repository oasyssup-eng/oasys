import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';

// ── Event Types ─────────────────────────────────────────────────────

export interface WaiterEvent {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// ── In-Memory Pub/Sub ───────────────────────────────────────────────

interface WaiterSubscriber {
  ws: WebSocket;
  unitId: string;
  employeeId: string;
}

const waiterSubscribers = new Map<string, WaiterSubscriber>(); // keyed by a unique id
const HEARTBEAT_INTERVAL = 30_000;
const STALE_TIMEOUT = 90_000;
let subscriberCounter = 0;

// ── Publish to Waiters ──────────────────────────────────────────────

/**
 * Broadcast an event to all connected waiters for a given unit.
 * Called by other modules when events happen (delivery, split, new order, etc.).
 */
export function publishWaiterEvent(unitId: string, event: WaiterEvent): void {
  const message = JSON.stringify(event);

  for (const sub of waiterSubscribers.values()) {
    if (sub.unitId === unitId && sub.ws.readyState === 1 /* OPEN */) {
      sub.ws.send(message);
    }
  }
}

// ── Heartbeat ───────────────────────────────────────────────────────

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

export async function registerWaiterWs(app: FastifyInstance): Promise<void> {
  app.get(
    '/ws/waiter',
    { websocket: true },
    (socket: WebSocket, _request) => {
      let subId: string | null = null;
      const { heartbeat } = setupHeartbeat(socket);

      socket.on('message', async (raw) => {
        try {
          const msg = JSON.parse(raw.toString());

          if (msg.type === 'authenticate' && msg.token) {
            // Verify JWT
            try {
              const payload = app.jwt.verify<{
                employeeId: string;
                unitId: string;
                role: string;
                name: string;
              }>(msg.token);

              subscriberCounter++;
              subId = `waiter_${subscriberCounter}`;

              waiterSubscribers.set(subId, {
                ws: socket,
                unitId: payload.unitId,
                employeeId: payload.employeeId,
              });

              socket.send(
                JSON.stringify({
                  type: 'authenticated',
                  employeeId: payload.employeeId,
                  name: payload.name,
                }),
              );
            } catch {
              socket.send(
                JSON.stringify({ error: 'Invalid or expired token' }),
              );
              socket.close();
            }
          }
        } catch {
          socket.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      function cleanup() {
        clearInterval(heartbeat);
        if (subId) {
          waiterSubscribers.delete(subId);
        }
      }

      socket.on('close', cleanup);
      socket.on('error', cleanup);
    },
  );
}

/** Get waiter subscriber count (for monitoring) */
export function getWaiterSubscriberCount(): number {
  return waiterSubscribers.size;
}

/** Clear all waiter subscribers (for testing) */
export function clearWaiterSubscribers(): void {
  waiterSubscribers.clear();
}
