import { useEffect, useState, useRef, useCallback } from 'react';

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
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function usePositionsWebSocket(
  url: string,
  options: UsePositionsWebSocketOptions = {}
) {
  const { reconnectInterval = 3000, maxReconnectAttempts = 10 } = options;

  const [connected, setConnected] = useState(false);
  const [positions, setPositions] = useState<PositionWS[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent reconnect on manual close
      wsRef.current.close();
      wsRef.current = null;
    }
    
    isConnectingRef.current = false;
  }, []);

  const connect = useCallback(() => {
    if (isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;
    
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Positions WebSocket connected');
        setConnected(true);
        setError(null);
        setReconnectCount(0);
        isConnectingRef.current = false;
      };

      ws.onmessage = (event) => {
        try {
          const message: PositionMessage = JSON.parse(event.data);
          if (message.type === 'positions') {
            setPositions(message.positions);
            setLastUpdate(new Date(message.timestamp));
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('Positions WebSocket error:', err);
        setError('WebSocket connection error');
      };

      ws.onclose = () => {
        console.log('Positions WebSocket disconnected');
        setConnected(false);
        isConnectingRef.current = false;

        // Attempt to reconnect only if we haven't exceeded max attempts
        if (reconnectCount < maxReconnectAttempts && reconnectTimeoutRef.current === null) {
          console.log(`Reconnecting... attempt ${reconnectCount + 1}/${maxReconnectAttempts}`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            setReconnectCount((prev) => prev + 1);
          }, reconnectInterval);
        } else if (reconnectCount >= maxReconnectAttempts) {
          setError('Max reconnection attempts reached');
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Failed to create WebSocket connection');
      isConnectingRef.current = false;
    }
  }, [url, reconnectInterval, maxReconnectAttempts, reconnectCount]);

  // Connect on mount and when URL changes
  useEffect(() => {
    if (!wsRef.current && !isConnectingRef.current) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Reset reconnect count when successfully connected
  useEffect(() => {
    if (connected) {
      setReconnectCount(0);
    }
  }, [connected]);

  return { connected, positions, error, reconnectCount, lastUpdate, connect, disconnect };
}
