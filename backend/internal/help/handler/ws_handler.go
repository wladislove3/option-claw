package handler

import (
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/user/option-pro/backend/pkg/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for development
		return true
	},
}

// WebSocketHub is the global WebSocket hub
var WebSocketHub *ws.Hub

// InitWebSocketHub initializes the global WebSocket hub
func InitWebSocketHub() {
	WebSocketHub = ws.NewHub()
	go WebSocketHub.Run()
}

// wsPositionsHandler handles WebSocket connections for position updates
// GET /ws/positions
func wsPositionsHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Failed to upgrade connection", http.StatusBadRequest)
		return
	}

	// Generate client ID
	clientID := r.RemoteAddr

	// Create and register client
	client := WebSocketHub.NewClient(conn, clientID)
	WebSocketHub.Register(client)

	// Start read and write pumps
	go client.WritePump()
	go client.ReadPump()
}

// wsGreeksHandler handles WebSocket connections for Greeks updates
// GET /ws/greeks
func wsGreeksHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Failed to upgrade connection", http.StatusBadRequest)
		return
	}

	clientID := r.RemoteAddr
	client := WebSocketHub.NewClient(conn, clientID)
	WebSocketHub.Register(client)

	go client.WritePump()
	go client.ReadPump()
}

// BroadcastPositionUpdate broadcasts a position update to all connected clients
func BroadcastPositionUpdate(update *ws.PositionUpdate) {
	if WebSocketHub != nil {
		WebSocketHub.BroadcastPositionUpdate(update)
	}
}

// BroadcastGreeksUpdate broadcasts Greeks update to all connected clients
func BroadcastGreeksUpdate(symbol string, greeks *ws.Greeks) {
	if WebSocketHub != nil {
		WebSocketHub.BroadcastGreeksUpdate(symbol, greeks)
	}
}

// GetWebSocketClientCount returns the number of connected clients
func GetWebSocketClientCount() int {
	if WebSocketHub == nil {
		return 0
	}
	return WebSocketHub.ClientCount()
}
