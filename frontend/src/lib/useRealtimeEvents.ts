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
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;

    const host = window.location.hostname || "localhost";
    const wsUrl = `ws://${host}:8080/ws/events`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send initial ping
        try {
          ws.send("ping");
        } catch {}
      };

      ws.onmessage = (e) => {
        if (e.data === "pong") return;
        try {
          const payload: RealtimeEventPayload = JSON.parse(e.data);
          if (onEventRef.current) {
            onEventRef.current(payload);
          }
        } catch {}
      };

      ws.onclose = () => {
        wsRef.current = null;
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      reconnectTimeoutRef.current = setTimeout(connect, 4000);
    }
  }, []);

  useEffect(() => {
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
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);
}
