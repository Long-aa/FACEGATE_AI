"use client";

import { useEffect, useRef, useCallback } from "react";

export interface RealtimeEventPayload {
  type:
    | "RECOGNITION_EVENT"
    | "DOOR_UPDATE"
    | "ALERT_NEW"
    | "KPI_UPDATE"
    | "USER_DELETED"
    | "USER_CREATED"
    | "USER_UPDATED"
    | (string & {});
  data: any;
}

export function useRealtimeEvents(onEvent?: (event: RealtimeEventPayload) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onEventRef = useRef(onEvent);
  const isMountedRef = useRef(true);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (typeof window === "undefined" || !isMountedRef.current) return;

    const host = window.location.hostname || "localhost";
    const wsUrl = `ws://${host}:8080/ws/events`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) {
          try { ws.close(1000, "Unmounted"); } catch {}
          return;
        }
        try {
          ws.send("ping");
        } catch {}
      };

      ws.onmessage = (e) => {
        if (!isMountedRef.current || e.data === "pong") return;
        try {
          const payload: RealtimeEventPayload = JSON.parse(e.data);
          if (onEventRef.current) {
            onEventRef.current(payload);
          }
        } catch {}
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!isMountedRef.current) return;
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try { wsRef.current.close(); } catch {}
        }
      };
    } catch {
      if (isMountedRef.current) {
        reconnectTimeoutRef.current = setTimeout(connect, 4000);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    // Heartbeat ping every 25s
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send("ping");
        } catch {}
      }
    }, 25000);

    return () => {
      isMountedRef.current = false;
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        const ws = wsRef.current;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        if (ws.readyState === WebSocket.OPEN) {
          try { ws.close(1000, "Unmount"); } catch {}
        } else if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => {
            try { ws.close(1000, "Unmount"); } catch {}
          };
        }
        wsRef.current = null;
      }
    };
  }, [connect]);
}
