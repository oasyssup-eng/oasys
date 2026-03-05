import { useEffect, useRef, useCallback, useState } from 'react';

const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined)
  ? `${import.meta.env.VITE_WS_URL}`.replace('/ws/kds', '/ws/kds-pickup')
  : 'ws://localhost:3001/api/v1/ws/kds-pickup';
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001/api/v1';
const POLL_INTERVAL = 10_000;
const RECONNECT_DELAY = 3000;

interface PickupData {
  unitName: string;
  ready: Array<{
    orderNumber: number | null;
    readyAt: string;
    elapsedSinceReady: number;
    items: string[];
  }>;
  preparing: Array<{
    orderNumber: number | null;
    estimatedMinutes: number;
  }>;
  lastUpdated: string;
}

export function usePickupBoard(slug: string) {
  const [data, setData] = useState<PickupData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/kds/pickup-board?slug=${encodeURIComponent(slug)}&limit=20`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError('Erro ao carregar painel');
    }
  }, [slug]);

  const connectWS = useCallback(() => {
    if (!slug) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', slug }));
    };

    ws.onmessage = () => {
      // On any pickup event, re-fetch
      fetchBoard();
    };

    ws.onclose = () => {
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connectWS, RECONNECT_DELAY);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [slug, fetchBoard]);

  useEffect(() => {
    fetchBoard();
    connectWS();

    // Fallback polling
    pollTimer.current = setInterval(fetchBoard, POLL_INTERVAL);

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (pollTimer.current) clearInterval(pollTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [fetchBoard, connectWS]);

  return { data, error };
}
