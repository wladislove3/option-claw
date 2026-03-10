package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/user/option-pro/backend/internal/bybit"
)

const (
	positionReadTimeout  = 60 * time.Second
	positionWriteTimeout = 10 * time.Second
	positionPingPeriod   = 30 * time.Second
)

type positionsClient struct {
	conn    *websocket.Conn
	writeMu sync.Mutex
}

var (
	positionClients   = make(map[*positionsClient]struct{})
	positionClientsMu sync.RWMutex
	bybitClient       *bybit.Client
)

// Position represents a Bybit option position for WebSocket
type Position struct {
	Symbol           string  `json:"symbol"`
	Size             string  `json:"size"`
	Side             string  `json:"side"`
	AvgPrice         string  `json:"avgPrice"`
	MarkPrice        string  `json:"markPrice"`
	PositionValue    float64 `json:"positionValue"`
	UnrealisedPnl    float64 `json:"unrealisedPnl"`
	CurRealisedPnl   float64 `json:"curRealisedPnl"`
	Delta            float64 `json:"delta"`
	Gamma            float64 `json:"gamma"`
	Theta            float64 `json:"theta"`
	Vega             float64 `json:"vega"`
	UnrealisedPnlPct float64 `json:"unrealisedPnlPct"`
}

// PositionMessage is sent to all connected clients
type PositionMessage struct {
	Type      string     `json:"type"`
	Positions []Position `json:"positions"`
	Timestamp int64      `json:"timestamp"`
}

// Init initializes the WebSocket with Bybit client
func Init(client *bybit.Client) {
	bybitClient = client
}

// WSPositionsHandler handles WebSocket connections for position updates
func WSPositionsHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}

	client := &positionsClient{conn: conn}
	registerPositionClient(client)
	log.Println("Client connected. Total clients:", positionClientCount())

	var cleanupOnce sync.Once
	cleanup := func() {
		cleanupOnce.Do(func() {
			unregisterPositionClient(client)
			_ = client.conn.Close()
			log.Println("Client disconnected. Total clients:", positionClientCount())
		})
	}
	defer cleanup()

	if err := client.sendSnapshot(fetchBybitPositions()); err != nil {
		log.Println("Error sending initial positions:", err)
		return
	}

	if err := client.conn.SetReadDeadline(time.Now().Add(positionReadTimeout)); err != nil {
		log.Println("Error setting read deadline:", err)
		return
	}
	client.conn.SetPongHandler(func(string) error {
		return client.conn.SetReadDeadline(time.Now().Add(positionReadTimeout))
	})

	pingDone := make(chan struct{})
	go func() {
		ticker := time.NewTicker(positionPingPeriod)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				if err := client.writePing(); err != nil {
					cleanup()
					return
				}
			case <-pingDone:
				return
			}
		}
	}()
	defer close(pingDone)

	for {
		if _, _, err := client.conn.ReadMessage(); err != nil {
			return
		}
	}
}

func (c *positionsClient) sendSnapshot(positions []Position) error {
	msg := PositionMessage{
		Type:      "positions",
		Positions: positions,
		Timestamp: time.Now().UnixMilli(),
	}

	return c.writeJSON(msg)
}

func (c *positionsClient) writeJSON(v any) error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()

	if err := c.conn.SetWriteDeadline(time.Now().Add(positionWriteTimeout)); err != nil {
		return err
	}

	return c.conn.WriteJSON(v)
}

func (c *positionsClient) writePing() error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()

	deadline := time.Now().Add(positionWriteTimeout)
	if err := c.conn.SetWriteDeadline(deadline); err != nil {
		return err
	}

	return c.conn.WriteControl(websocket.PingMessage, []byte("ping"), deadline)
}

func registerPositionClient(client *positionsClient) {
	positionClientsMu.Lock()
	defer positionClientsMu.Unlock()
	positionClients[client] = struct{}{}
}

func unregisterPositionClient(client *positionsClient) {
	positionClientsMu.Lock()
	defer positionClientsMu.Unlock()
	delete(positionClients, client)
}

func snapshotPositionClients() []*positionsClient {
	positionClientsMu.RLock()
	defer positionClientsMu.RUnlock()

	clients := make([]*positionsClient, 0, len(positionClients))
	for client := range positionClients {
		clients = append(clients, client)
	}

	return clients
}

func positionClientCount() int {
	positionClientsMu.RLock()
	defer positionClientsMu.RUnlock()
	return len(positionClients)
}

func parseFloat(s string) float64 {
	if s == "" {
		return 0
	}
	val, _ := strconv.ParseFloat(s, 64)
	return val
}

func fetchBybitPositions() []Position {
	if bybitClient == nil {
		return []Position{}
	}

	bybitPositions, err := bybitClient.GetOptionPositions()
	if err != nil {
		log.Println("Error fetching Bybit positions:", err)
		return []Position{}
	}

	positions := make([]Position, 0, len(bybitPositions))
	for _, pos := range bybitPositions {
		positionValue := parseFloat(pos.PositionValue)
		unrealisedPnl := parseFloat(pos.UnrealisedPnl)
		unrealisedPnlPct := 0.0
		if positionValue > 0 {
			unrealisedPnlPct = (unrealisedPnl / positionValue) * 100
		}

		positions = append(positions, Position{
			Symbol:           pos.Symbol,
			Size:             pos.Size,
			Side:             pos.Side,
			AvgPrice:         pos.EntryPrice,
			MarkPrice:        pos.MarkPrice,
			PositionValue:    positionValue,
			UnrealisedPnl:    unrealisedPnl,
			CurRealisedPnl:   0,
			Delta:            parseFloat(pos.Delta),
			Gamma:            parseFloat(pos.Gamma),
			Theta:            parseFloat(pos.Theta),
			Vega:             parseFloat(pos.Vega),
			UnrealisedPnlPct: unrealisedPnlPct,
		})
	}

	return positions
}

// BroadcastPositions sends positions to all connected clients
func BroadcastPositions() {
	clients := snapshotPositionClients()
	if len(clients) == 0 {
		return
	}

	msg := PositionMessage{
		Type:      "positions",
		Positions: fetchBybitPositions(),
		Timestamp: time.Now().UnixMilli(),
	}

	failed := make([]*positionsClient, 0)
	for _, client := range clients {
		if err := client.writeJSON(msg); err != nil {
			log.Println("Error sending to client:", err)
			failed = append(failed, client)
			_ = client.conn.Close()
		}
	}

	for _, client := range failed {
		unregisterPositionClient(client)
	}
}

// StartPositionBroadcaster fetches positions periodically and broadcasts to all clients
func StartPositionBroadcaster(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		count := positionClientCount()
		if count == 0 {
			continue
		}

		log.Println("Broadcasting positions to", count, "clients")
		BroadcastPositions()
	}
}

// GetPositionsHandler handles REST API requests (fallback for non-WebSocket clients)
func GetPositionsHandler(w http.ResponseWriter, r *http.Request) {
	positions := fetchBybitPositions()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"positions": positions,
		"timestamp": time.Now().UnixMilli(),
	})
}
