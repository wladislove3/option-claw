// Next.js API Route for WebSocket proxy to Bybit
// This runs on the server and maintains a single WebSocket connection to Bybit

import WebSocket from 'ws';

const BYBIT_WS_URL = 'wss://stream.bybit.com/v5/public/option';

interface Client {
  ws: import('ws').WebSocket;
  positions: any[];
}

const clients = new Set<Client>();
let bybitWs: WebSocket | null = null;
let positionsCache: any[] = [];
let lastUpdateTime = 0;

// Subscribe to option positions channel
function subscribeToBybit() {
  if (bybitWs?.readyState === WebSocket.OPEN) {
    bybitWs.send(JSON.stringify({
      op: 'subscribe',
      args: ['position']
    }));
  }
}

function connectToBybit() {
  bybitWs = new WebSocket(BYBIT_WS_URL);
  
  bybitWs.on('open', () => {
    console.log('Connected to Bybit WebSocket');
    subscribeToBybit();
  });
  
  bybitWs.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.topic === 'position' && message.data) {
        positionsCache = message.data;
        lastUpdateTime = Date.now();
        
        // Broadcast to all connected clients
        broadcastToClients({
          type: 'positions',
          positions: positionsCache,
          timestamp: lastUpdateTime
        });
      }
    } catch (e) {
      console.error('Error parsing Bybit message:', e);
    }
  });
  
  bybitWs.on('error', (err) => {
    console.error('Bybit WebSocket error:', err);
  });
  
  bybitWs.on('close', () => {
    console.log('Bybit WebSocket closed, reconnecting...');
    setTimeout(connectToBybit, 3000);
  });
}

function broadcastToClients(data: any) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}

// Initialize Bybit connection once
if (!bybitWs) {
  connectToBybit();
}

export async function GET(request: Request) {
  const { upgradeToWebSocket } = request;
  
  if (!upgradeToWebSocket) {
    return new Response('Upgrade Required', { status: 426 });
  }
  
  const ws = await upgradeToWebSocket();
  
  const client: Client = {
    ws: ws as any,
    positions: []
  };
  
  clients.add(client);
  
  // Send cached positions immediately
  ws.send(JSON.stringify({
    type: 'positions',
    positions: positionsCache,
    timestamp: lastUpdateTime
  }));
  
  ws.on('close', () => {
    clients.delete(client);
  });
  
  return new Response();
}
