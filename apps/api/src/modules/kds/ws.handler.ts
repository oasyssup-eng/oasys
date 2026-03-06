import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';

// ── Event Types ─────────────────────────────────────────────────────

export interface KDSEvent {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface PickupEvent {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// ── In-Memory Pub/Sub ───────────────────────────────────────────────

interface KDSSubscriber {
  ws: WebSocket;
  unitId: string;
  employeeId: string;
}

interface PickupSubscriber {
  ws: WebSocket;
  slug: string;
}

const kdsSubscribers = new Map<string, KDSSubscriber>();
const pickupSubscribers = new Map<string, PickupSubscriber>();
const HEARTBEAT_INTERVAL = 30_000;
const STALE_TIMEOUT = 90_000;
let subscriberCounter = 0;

// ── Publish to KDS Operators ────────────────────────────────────────

export function publishKDSEvent(unitId: string, event: KDSEvent): void {
  const message = JSON.stringify(event);

  for (const sub of kdsSubscribers.values()) {
    if (sub.unitId === unitId && sub.ws.readyState === 1 /* OPEN */) {
      sub.ws.send(message);
    }
  }
}

// ── Publish to Pickup Board ─────────────────────────────────────────

export function publishPickupEvent(slug: string, event: PickupEvent): void {
  const message = JSON.stringify(event);

  for (const sub of pickupSubscribers.values()) {
    if (sub.slug === slug && sub.ws.readyState === 1 /* OPEN */) {
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

export async function registerKDSWs(app: FastifyInstance): Promise<void> {
  // ── Channel 1: KDS Authenticated (for operators) ──────────────
  app.get(
    '/ws/kds',
    { websocket: true },
    (socket: WebSocket, _request) => {
      let subId: string | null = null;
      const { heartbeat } = setupHeartbeat(socket);

      socket.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());

          if (msg.type === 'authenticate' && msg.token) {
            try {
              const payload = app.jwt.verify<{
                employeeId: string;
                unitId: string;
                role: string;
                name: string;
              }>(msg.token);

              subscriberCounter++;
              subId = `kds_${subscriberCounter}`;

              kdsSubscribers.set(subId, {
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
          kdsSubscribers.delete(subId);
        }
      }

      socket.on('close', cleanup);
      socket.on('error', cleanup);
    },
  );

  // ── Channel 2: Pickup Board Public (for TV) ───────────────────
  app.get(
    '/ws/kds-pickup',
    { websocket: true },
    (socket: WebSocket, _request) => {
      let subId: string | null = null;
      const { heartbeat } = setupHeartbeat(socket);

      socket.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());

          if (msg.type === 'subscribe' && msg.slug) {
            subscriberCounter++;
            subId = `pickup_${subscriberCounter}`;

            pickupSubscribers.set(subId, {
              ws: socket,
              slug: msg.slug,
            });

            socket.send(
              JSON.stringify({
                type: 'subscribed',
                slug: msg.slug,
              }),
            );
          }
        } catch {
          socket.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      function cleanup() {
        clearInterval(heartbeat);
        if (subId) {
          pickupSubscribers.delete(subId);
        }
      }

      socket.on('close', cleanup);
      socket.on('error', cleanup);
    },
  );
}

/** Get KDS subscriber count (for monitoring) */
export function getKDSSubscriberCount(): number {
  return kdsSubscribers.size + pickupSubscribers.size;
}

/** Clear all subscribers (for testing) */
export function clearKDSSubscribers(): void {
  kdsSubscribers.clear();
  pickupSubscribers.clear();
}
