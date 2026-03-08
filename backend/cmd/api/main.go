package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/rs/cors"
	"github.com/user/option-pro/backend/internal/bybit"
	"github.com/user/option-pro/backend/internal/math"
	"github.com/user/option-pro/backend/internal/websocket"
)

func main() {
	// Root context for background tasks
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 1. Initialize WebSocket Hub (Broadcaster)
	hub := websocket.NewHub()
	go hub.Run()

	// 2. Initialize MarketStreamer (Bybit WebSocket Client)
	// Passes the hub's broadcast channel to the streamer
	streamer := bybit.NewMarketStreamer(ctx, hub.Broadcast)
	streamer.Start()

	// 3. Temporary Logging: Show one tick every 5 seconds to verify stream is live
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				// Pick any one item from the cache to show it's alive
				streamer.Cache.Range(func(key, value interface{}) bool {
					tick := value.(bybit.OptionTick)
					log.Printf("[LIVE TICK] %s | Price: %.2f | IV: %.2f%% | Δ: %.4f", 
						tick.Symbol, tick.MarkPrice, tick.IV*100, tick.Delta)
					return false // Stop after first item
				})
			}
		}
	}()

	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Timeout(60 * time.Second))

	// API routes
	r.Route("/api", func(r chi.Router) {
		r.Post("/calculate", calculateHandler)
		r.Get("/health", healthHandler)
		
		// WebSocket endpoint for real-time analytics
		r.Get("/ws/v1/analytics", func(w http.ResponseWriter, r *http.Request) {
			websocket.ServeWS(hub, w, r)
		})
	})

	// CORS configuration
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://172.24.114.81:3000"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	})

	handler := c.Handler(r)

	log.Println("Starting Whale Terminal API server on :8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func calculateHandler(w http.ResponseWriter, r *http.Request) {
	var req math.MatrixRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "Invalid JSON", err.Error(), http.StatusBadRequest)
		return
	}

	// Validate input
	if err := validateRequest(req); err != nil {
		sendError(w, "Validation error", err.Error(), http.StatusBadRequest)
		return
	}

	// Set default days to expiry if not provided
	if req.DaysToExpiry <= 0 {
		req.DaysToExpiry = 30
	}

	// Generate P&L matrix
	response := math.GeneratePnLMatrix(req, 100, 50)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func validateRequest(req math.MatrixRequest) error {
	if req.UnderlyingPrice <= 0 {
		return fmt.Errorf("underlying_price must be positive")
	}
	if req.Volatility <= 0 {
		return fmt.Errorf("volatility must be positive")
	}
	if req.RiskFreeRate < 0 {
		return fmt.Errorf("risk_free_rate cannot be negative")
	}
	if len(req.Legs) == 0 {
		return fmt.Errorf("at least one option leg is required")
	}

	for i, leg := range req.Legs {
		if leg.Strike <= 0 {
			return fmt.Errorf("leg %d: strike must be positive", i)
		}
		if leg.Premium < 0 {
			return fmt.Errorf("leg %d: premium cannot be negative", i)
		}
		if leg.Quantity == 0 {
			return fmt.Errorf("leg %d: quantity must be non-zero", i)
		}
	}

	return nil
}

func sendError(w http.ResponseWriter, message, details string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(math.ErrorResponse{
		Error:   message,
		Details: details,
	})
}
