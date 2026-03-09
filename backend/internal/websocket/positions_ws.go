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

var (
	clients   = make(map[*websocket.Conn]bool)
	clientsMu sync.RWMutex
	bybitClient *bybit.Client
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
	Type       string     `json:"type"`
	Positions  []Position `json:"positions"`
	Timestamp  int64      `json:"timestamp"`
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
	defer conn.Close()

	clientsMu.Lock()
	clients[conn] = true
	clientsMu.Unlock()

	log.Println("Client connected. Total clients:", len(clients))

	// Send initial positions
	sendPositions(conn)

	// Handle messages from client (ping/pong)
	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	// Keep connection alive
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}

	clientsMu.Lock()
	delete(clients, conn)
	clientsMu.Unlock()

	log.Println("Client disconnected. Total clients:", len(clients))
}

func sendPositions(conn *websocket.Conn) {
	positions := fetchBybitPositions()

	msg := PositionMessage{
		Type:      "positions",
		Positions: positions,
		Timestamp: time.Now().UnixMilli(),
	}

	conn.WriteJSON(msg)
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
	positions := fetchBybitPositions()

	msg := PositionMessage{
		Type:      "positions",
		Positions: positions,
		Timestamp: time.Now().UnixMilli(),
	}

	clientsMu.RLock()
	defer clientsMu.RUnlock()

	for client := range clients {
		if err := client.WriteJSON(msg); err != nil {
			log.Println("Error sending to client:", err)
			client.Close()
			delete(clients, client)
		}
	}
}

// StartPositionBroadcaster fetches positions periodically and broadcasts to all clients
func StartPositionBroadcaster(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		if len(clients) > 0 {
			log.Println("Broadcasting positions to", len(clients), "clients")
			BroadcastPositions()
		}
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
