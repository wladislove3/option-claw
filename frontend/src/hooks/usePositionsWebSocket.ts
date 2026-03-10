import { useCallback, useEffect, useRef, useState } from 'react';

interface PositionWS {
  symbol: string;
  size: string;
  side: string;
  avgPrice: string;
  markPrice: string;
  positionValue: number;
  unrealisedPnl: number;
  unrealisedPnlPct: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

interface PositionMessage {
  type: string;
  positions: PositionWS[];
  timestamp: number;
}

interface UsePositionsWebSocketOptions {
  enabled?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

type ReconnectTimer = ReturnType<typeof setTimeout>;

export function usePositionsWebSocket(
  url: string,
  options: UsePositionsWebSocketOptions = {}
) {
  const {
    enabled = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const [connected, setConnected] = useState(false);
  const [positions, setPositions] = useState<PositionWS[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReconnectTimer | null>(null);
  const isConnectingRef = useRef(false);
  const reconnectCountRef = useRef(0);
  const manualCloseRef = useRef(false);
  const unmountedRef = useRef(false);
  const openSocketRef = useRef<() => void>(() => {});

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const closeSocket = useCallback((manualClose: boolean) => {
    manualCloseRef.current = manualClose;
    clearReconnectTimer();
    isConnectingRef.current = false;

    const socket = wsRef.current;
    wsRef.current = null;

    if (!socket) {
      return;
    }

    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;

    if (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    ) {
      socket.close();
    }
  }, [clearReconnectTimer]);

  const openSocket = useCallback(() => {
    if (!enabled || manualCloseRef.current || unmountedRef.current || isConnectingRef.current) {
      return;
    }

    const current = wsRef.current;
    if (
      current &&
      (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    isConnectingRef.current = true;

    try {
      const socket = new WebSocket(url);
      wsRef.current = socket;

      socket.onopen = () => {
        if (wsRef.current !== socket) {
          socket.close();
          return;
        }

        isConnectingRef.current = false;
        reconnectCountRef.current = 0;
        setReconnectCount(0);
        setConnected(true);
        setError(null);
      };

      socket.onmessage = (event) => {
        try {
          const message: PositionMessage = JSON.parse(event.data);
          if (message.type !== 'positions') {
            return;
          }

          setPositions(Array.isArray(message.positions) ? message.positions : []);
          setLastUpdate(new Date(message.timestamp));
        } catch (parseError) {
          console.error('Failed to parse positions WebSocket message:', parseError);
        }
      };

      socket.onerror = () => {
        if (wsRef.current === socket) {
          setError('WebSocket connection error');
        }
      };

      socket.onclose = () => {
        if (wsRef.current === socket) {
          wsRef.current = null;
        }

        isConnectingRef.current = false;
        setConnected(false);

        if (
          manualCloseRef.current ||
          unmountedRef.current ||
          !enabled ||
          reconnectTimeoutRef.current
        ) {
          return;
        }

        if (reconnectCountRef.current >= maxReconnectAttempts) {
          setError('Max reconnection attempts reached');
          return;
        }

        reconnectCountRef.current += 1;
        setReconnectCount(reconnectCountRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          openSocketRef.current();
        }, reconnectInterval);
      };
    } catch (createError) {
      isConnectingRef.current = false;
      setConnected(false);
      setError('Failed to create WebSocket connection');
      console.error('Failed to create positions WebSocket:', createError);
    }
  }, [enabled, maxReconnectAttempts, reconnectInterval, url]);

  useEffect(() => {
    openSocketRef.current = openSocket;
  }, [openSocket]);

  const connect = useCallback(() => {
    manualCloseRef.current = false;
    clearReconnectTimer();
    openSocketRef.current();
  }, [clearReconnectTimer]);

  const disconnect = useCallback(() => {
    closeSocket(true);
    setConnected(false);
  }, [closeSocket]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      closeSocket(true);
    };
  }, [closeSocket]);

  useEffect(() => {
    if (!enabled) {
      closeSocket(true);
      return;
    }

    manualCloseRef.current = false;
    const timer = setTimeout(() => {
      openSocket();
    }, 0);

    return () => {
      clearTimeout(timer);
      closeSocket(true);
    };
  }, [closeSocket, enabled, openSocket, url]);

  return {
    connected,
    positions,
    error,
    reconnectCount,
    lastUpdate,
    connect,
    disconnect,
  };
}
