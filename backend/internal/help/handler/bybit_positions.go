package handler

import (
	"encoding/json"
	"net/http"
	"github.com/user/option-pro/backend/internal/bybit"
	"github.com/user/option-pro/backend/internal/config"
)

// GetBybitPositionsHandler fetches real option positions from Bybit
func GetBybitPositionsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Load config to get keys
	cfg := config.Load()
	client := bybit.NewClient(cfg.BybitAPIKey, cfg.BybitAPISecret)
	
	positions, err := client.GetOptionPositions()
	if err != nil {
		sendError(w, "Failed to fetch positions", err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(positions)
}

func sendError(w http.ResponseWriter, message, details string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{
		"error":   message,
		"details": details,
	})
}
