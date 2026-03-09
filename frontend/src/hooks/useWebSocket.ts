import { useEffect, useState, useCallback } from 'react';

interface UseWebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const { reconnectInterval = 3000, maxReconnectAttempts = 5 } = options;
  
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      setError(null);
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
      if (reconnectCount < maxReconnectAttempts) {
        console.log(`Reconnecting... attempt ${reconnectCount + 1}`);
        setTimeout(() => {
          setReconnectCount((prev) => prev + 1);
          connect();
        }, reconnectInterval);
      }
    };

    return () => {
      ws.close();
    };
  }, [url, reconnectInterval, maxReconnectAttempts, reconnectCount]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return { connected, data, error, reconnectCount };
}
