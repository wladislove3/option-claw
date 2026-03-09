const http = require('http');
const crypto = require('crypto');
const WebSocket = require('ws');

const BYBIT_API_KEY = 'RUqj3bpXzRlrVgIVDa';
const BYBIT_API_SECRET = '0r3Onz3QkvnC3nbZmLZuE1RGt0KctfkdKPn1';
const BYBIT_API_URL = 'https://api.bybit.com';

const clients = new Set();
const positionsCache = { data: [], timestamp: 0 };
let lastRequestTime = 0;
let isFetching = false;
const RATE_LIMIT_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;

function generateSignature(timestamp, apiKey, secret, params) {
  const signVal = timestamp + apiKey + '5000' + params;
  return crypto.createHmac('sha256', secret).update(signVal).digest('hex');
}

async function fetchBybitPositions() {
  // Prevent concurrent requests
  if (isFetching) {
    console.log('Fetch already in progress, skipping');
    return;
  }

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  // Rate limiting - wait if needed
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest));
  }

  isFetching = true;
  const timestamp = Date.now().toString();
  const params = 'category=option';
  const signature = generateSignature(timestamp, BYBIT_API_KEY, BYBIT_API_SECRET, params);
  const url = `${BYBIT_API_URL}/v5/position/list?${params}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': BYBIT_API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': '5000',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    lastRequestTime = Date.now();
    reconnectAttempts = 0; // Reset on success

    const text = await response.text();
    if (!text) {
      console.log('Empty response from Bybit');
      isFetching = false;
      return;
    }

    const data = JSON.parse(text);

    if (data.retCode === 0) {
      positionsCache.data = data.result?.list || [];
      positionsCache.timestamp = Date.now();
      console.log(`Fetched ${positionsCache.data.length} positions from Bybit`);

      broadcastToClients({
        type: 'positions',
        positions: positionsCache.data,
        timestamp: positionsCache.timestamp
      });
    } else {
      console.error('Bybit API error:', data.retCode, data.retMsg);
      // Handle rate limit error
      if (data.retCode === 10004 || data.retMsg?.includes('rate limit')) {
        console.log('Rate limit hit, waiting longer...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  } catch (error) {
    console.error('Error fetching from Bybit:', error.message);
    reconnectAttempts++;
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnect attempts reached, stopping fetches');
      return;
    }
  } finally {
    isFetching = false;
  }
}

function broadcastToClients(data) {
  const message = JSON.stringify(data);
  const failedClients = [];

  clients.forEach((client) => {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      } else if (client.readyState === WebSocket.CLOSED) {
        failedClients.push(client);
      }
    } catch (err) {
      console.error('Error sending to client:', err.message);
      failedClients.push(client);
    }
  });

  // Clean up closed clients
  failedClients.forEach((client) => {
    clients.delete(client);
  });
}

// Poll Bybit every 5 seconds (but rate limited to 2 seconds minimum)
let fetchInterval = null;

function startFetching() {
  if (fetchInterval) return;
  
  fetchInterval = setInterval(() => {
    if (clients.size > 0 && !isFetching) {
      fetchBybitPositions().catch(err => {
        console.error('Unhandled fetch error:', err);
      });
    }
  }, 5000);
  
  console.log('Started position fetching interval');
}

function stopFetching() {
  if (fetchInterval) {
    clearInterval(fetchInterval);
    fetchInterval = null;
    console.log('Stopped position fetching interval');
  }
}

// Create HTTP server for health checks
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      clients: clients.size,
      positionsCount: positionsCache.data.length,
      lastUpdate: positionsCache.timestamp,
      lastRequest: lastRequestTime,
      rateLimitMs: RATE_LIMIT_MS,
      isFetching: isFetching,
      reconnectAttempts: reconnectAttempts
    }));
  } else if (req.url === '/stop' && req.method === 'POST') {
    stopFetching();
    res.writeHead(200);
    res.end('Stopped');
  } else if (req.url === '/start' && req.method === 'POST') {
    startFetching();
    res.writeHead(200);
    res.end('Started');
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws/positions' });

wss.on('connection', (ws) => {
  const clientId = Math.random().toString(36).substr(2, 9);
  console.log(`Client ${clientId} connected. Total: ${clients.size + 1}`);
  clients.add(ws);

  // Send cached positions immediately
  if (positionsCache.data.length > 0) {
    try {
      ws.send(JSON.stringify({
        type: 'positions',
        positions: positionsCache.data,
        timestamp: positionsCache.timestamp
      }));
    } catch (err) {
      console.error('Error sending cached positions:', err.message);
    }
  } else {
    // Fetch immediately for new client (only if not already fetching)
    if (!isFetching) {
      fetchBybitPositions().catch(err => {
        console.error('Error fetching for new client:', err);
      });
    }
  }

  // Start fetching when first client connects
  if (clients.size === 1) {
    startFetching();
  }

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Client ${clientId} disconnected. Total: ${clients.size}`);
    
    // Stop fetching when last client disconnects
    if (clients.size === 0) {
      stopFetching();
    }
  });

  ws.on('error', (err) => {
    console.error(`Client ${clientId} error:`, err.message);
    clients.delete(ws);
  });

  ws.on('pong', () => {
    // Connection is alive
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  stopFetching();
  
  // Close all client connections
  clients.forEach((client) => {
    try {
      client.close(1001, 'Server shutting down');
    } catch (err) {
      console.error('Error closing client:', err.message);
    }
  });
  clients.clear();
  
  // Close WebSocket server
  wss.close(() => {
    console.log('WebSocket server closed');
    
    // Close HTTP server
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
  
  // Force exit after 5 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  process.emit('SIGTERM');
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't exit - keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - keep server running
});

const PORT = process.env.WS_PORT || 8081;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Rate limit: ${RATE_LIMIT_MS}ms between requests`);
  console.log(`Max reconnect attempts: ${MAX_RECONNECT_ATTEMPTS}`);
});
