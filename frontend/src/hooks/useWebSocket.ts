import { useEffect, useState, useCallback, useRef } from 'react';

interface UseWebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const { reconnectInterval = 3000, maxReconnectAttempts = 5 } = options;
  
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      setError(null);
      reconnectCountRef.current = 0;
      setReconnectCount(0);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setData(message);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError('WebSocket connection error');
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      
      // Attempt to reconnect
      if (reconnectCountRef.current < maxReconnectAttempts) {
        reconnectCountRef.current += 1;
        const nextAttempt = reconnectCountRef.current;
        console.log(`Reconnecting... attempt ${nextAttempt}`);
        setReconnectCount(nextAttempt);
        reconnectTimerRef.current = setTimeout(() => {
          connectRef.current();
        }, reconnectInterval);
      }
    };

    return () => {
      ws.close();
    };
  }, [url, reconnectInterval, maxReconnectAttempts]);

  useEffect(() => {
    connectRef.current = () => {
      const cleanup = connect();
      return cleanup;
    };
  }, [connect]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      cleanup();
    };
  }, [connect]);

  return { connected, data, error, reconnectCount };
}
