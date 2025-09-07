import { useState, useEffect, useRef, useCallback } from 'react';
import type { Transaction } from '@shared/schema';

export interface WebSocketData {
  metrics?: {
    stats: any;
    recentTransactions: Transaction[];
    processors: any[];
    timestamp: string;
  };
  transactions?: {
    transactions: Transaction[];
    pagination: any;
    timestamp: string;
  };
  health?: {
    status: string;
    uptime: number;
    memory: any;
    system: any;
    processors: any[];
    circuitBreakers: any;
    algorand: any;
    timestamp: string;
  };
}

export interface UseWebSocketReturn {
  data: WebSocketData;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [data, setData] = useState<WebSocketData>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;

  const connect = useCallback(() => {
    try {
      // Clear any existing timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Determine the correct WebSocket protocol and URL
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message.type, message);
          
          setData(prevData => ({
            ...prevData,
            [message.type]: message.data
          }));
        } catch (parseError) {
          console.error('Failed to parse WebSocket message:', parseError);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts.current);
          console.log(`Attempting to reconnect in ${delay}ms... (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setError('WebSocket connection failed after multiple attempts');
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
      };

    } catch (connectError) {
      console.error('Failed to create WebSocket connection:', connectError);
      setError('Failed to create WebSocket connection');
    }
  }, []);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    setError(null);
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    data,
    isConnected,
    error,
    reconnect
  };
}