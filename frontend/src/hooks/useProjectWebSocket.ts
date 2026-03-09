import { useEffect, useRef, useCallback } from 'react';

export type WSEvent = {
  type: string;
  data: Record<string, unknown>;
};

type WSEventHandler = (event: WSEvent) => void;

export function useProjectWebSocket(
  projectId: string | undefined,
  onEvent: WSEventHandler
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const onEventRef = useRef(onEvent);

  // Keep callback ref current without triggering reconnects
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    if (!projectId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    // Close existing connection if any
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsHost =
      import.meta.env.VITE_WS_URL || `${wsProtocol}://${window.location.host}`;
    const wsUrl = `${wsHost}/api/ws/projects/${projectId}?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);
      let pingInterval: ReturnType<typeof setInterval>;

      ws.onopen = () => {
        console.log(`[WS] Connected to project ${projectId}`);
        reconnectAttempts.current = 0;

        // Keep-alive ping every 30 seconds
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const data: WSEvent = JSON.parse(event.data);
          onEventRef.current(data);
        } catch {
          // ignore unparseable messages
        }
      };

      ws.onclose = (closeEvent) => {
        console.log(`[WS] Disconnected (code: ${closeEvent.code})`);
        clearInterval(pingInterval);
        wsRef.current = null;

        // Don't reconnect if auth failed
        if (closeEvent.code === 4001) return;

        // Exponential backoff reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            30000
          );
          reconnectAttempts.current++;
          console.log(
            `[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`
          );
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch {
      // connection error, will retry via onclose
    }
  }, [projectId]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return wsRef;
}
