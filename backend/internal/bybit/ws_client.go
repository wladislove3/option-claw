package bybit

import (
	"context"
	"encoding/json"
	"log"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	PublicWSOption = "wss://stream.bybit.com/v5/public/option"
	PingInterval   = 20 * time.Second
)

// OptionTick represents the latest market data and Greeks for a single option.
type OptionTick struct {
	Symbol    string  `json:"symbol"`
	MarkPrice float64 `json:"markPrice"`
	IV        float64 `json:"iv"`
	Delta     float64 `json:"delta"`
	Gamma     float64 `json:"gamma"`
	Vega      float64 `json:"vega"`
	Theta     float64 `json:"theta"`
	UpdatedAt int64   `json:"updatedAt"`
}

// WSRequest is used to send commands to Bybit (subscribe, ping).
type WSRequest struct {
	Op   string   `json:"op"`
	Args []string `json:"args,omitempty"`
}

// WSResponse represents the incoming message envelope.
type WSResponse struct {
	Topic string          `json:"topic"`
	Type  string          `json:"type"` // "snapshot" or "delta"
	Data  json.RawMessage `json:"data"` // Payload (usually array of objects)
}

// MarketStreamer manages the WebSockets connection and holds the in-memory cache.
type MarketStreamer struct {
	Cache     sync.Map // map[string]OptionTick (Thread-safe)
	Broadcast chan OptionTick
	url       string
	ctx       context.Context
}

// NewMarketStreamer initializes the streamer.
func NewMarketStreamer(ctx context.Context, broadcast chan OptionTick) *MarketStreamer {
	return &MarketStreamer{
		url:       PublicWSOption,
		ctx:       ctx,
		Broadcast: broadcast,
	}
}

// Start launches the connection and auto-reconnect loop in a separate goroutine.
func (m *MarketStreamer) Start() {
	go func() {
		for {
			select {
			case <-m.ctx.Done():
				log.Println("[WS] MarketStreamer shutting down...")
				return
			default:
				err := m.connectAndListen()
				if err != nil {
					log.Printf("[WS] Connection error: %v. Reconnecting in 3 seconds...", err)
					time.Sleep(3 * time.Second)
				}
			}
		}
	}()
}

func (m *MarketStreamer) connectAndListen() error {
	log.Printf("[WS] Connecting to %s", m.url)
	
	// Dial the WebSocket
	conn, _, err := websocket.DefaultDialer.Dial(m.url, nil)
	if err != nil {
		return err
	}
	defer conn.Close()

	log.Println("[WS] Connected successfully. Subscribing to ETH options...")

	// Launch Ping loop in background
	pingCtx, cancelPing := context.WithCancel(m.ctx)
	defer cancelPing()
	go m.pingLoop(pingCtx, conn)

	// Subscribe to ETH tickers and orderbook for more activity
	subReq := WSRequest{
		Op:   "subscribe",
		Args: []string{"tickers.ETH", "orderbook.50.ETH"},
	}
	if err := conn.WriteJSON(subReq); err != nil {
		return err
	}

	// Read loop
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			return err // Returns on connection drop -> triggers reconnect
		}

		m.handleMessage(message)
	}
}

func (m *MarketStreamer) pingLoop(ctx context.Context, conn *websocket.Conn) {
	ticker := time.NewTicker(PingInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			pingReq := WSRequest{Op: "ping"}
			if err := conn.WriteJSON(pingReq); err != nil {
				log.Printf("[WS] Ping failed: %v", err)
				return // read loop will catch the dead connection
			}
		}
	}
}

func (m *MarketStreamer) handleMessage(msg []byte) {
	// Debug log
	log.Println("[WS RAW]", string(msg))

	var resp WSResponse
	if err := json.Unmarshal(msg, &resp); err != nil {
		return // Ignore standard raw ping-pong strings
	}

	// We only process ETH tickers
	if resp.Topic == "tickers.ETH" && len(resp.Data) > 0 {
		var rawTicks []map[string]interface{}
		
		// Attempt array unmarshal
		if err := json.Unmarshal(resp.Data, &rawTicks); err != nil {
			// Fallback: try single object unmarshal
			var single map[string]interface{}
			if err2 := json.Unmarshal(resp.Data, &single); err2 == nil {
				rawTicks = append(rawTicks, single)
			} else {
				return
			}
		}

		now := time.Now().UnixMilli()
		
		for _, rawTick := range rawTicks {
			symbolInter, ok := rawTick["symbol"]
			if !ok {
				continue
			}
			symbol := symbolInter.(string)

			// Load existing state from Cache to apply deltas properly
			var tick OptionTick
			if existing, found := m.Cache.Load(symbol); found {
				tick = existing.(OptionTick)
			} else {
				tick = OptionTick{Symbol: symbol}
			}

			// Apply deltas (Bybit sends only changed fields)
			if val, ok := rawTick["markPrice"]; ok && val != "" {
				tick.MarkPrice = parseFloat(val)
			}
			if val, ok := rawTick["iv"]; ok && val != "" {
				tick.IV = parseFloat(val)
			}
			if val, ok := rawTick["delta"]; ok && val != "" {
				tick.Delta = parseFloat(val)
			}
			if val, ok := rawTick["gamma"]; ok && val != "" {
				tick.Gamma = parseFloat(val)
			}
			if val, ok := rawTick["vega"]; ok && val != "" {
				tick.Vega = parseFloat(val)
			}
			if val, ok := rawTick["theta"]; ok && val != "" {
				tick.Theta = parseFloat(val)
			}

			tick.UpdatedAt = now
			
			// Save back to thread-safe memory
			m.Cache.Store(symbol, tick)

			// Broadcast the update if channel is available
			if m.Broadcast != nil {
				select {
				case m.Broadcast <- tick:
				default:
					// Channel full, drop update to avoid blocking market data stream
				}
			}
		}
	}
}

// Helper for parsing string/float mixes safely
func parseFloat(val interface{}) float64 {
	switch v := val.(type) {
	case string:
		f, _ := strconv.ParseFloat(v, 64)
		return f
	case float64:
		return v
	}
	return 0
}
