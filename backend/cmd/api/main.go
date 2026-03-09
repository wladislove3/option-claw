package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/rs/cors"

	"github.com/user/option-pro/backend/internal/bybit"
	"github.com/user/option-pro/backend/internal/config"
	"github.com/user/option-pro/backend/internal/math"
	"github.com/user/option-pro/backend/internal/websocket"
)

func main() {
	// Load configuration
	cfg := config.Load()

	log.Printf("Starting Whale Terminal API server...")
	log.Printf("Configuration: BybitKey=%s, Port=%s", 
		maskString(cfg.BybitAPIKey), cfg.ServerPort)
	
	if cfg.BybitAPIKey == "" {
		log.Printf("[CRITICAL] BYBIT_API_KEY is empty! Loading from .env...")
	}

	// Initialize WebSocket Hub
	hub := websocket.NewHub()
	go hub.Run()
	log.Printf("WebSocket hub initialized")

	// Initialize Bybit client (for positions)
	bybitClient := bybit.NewClient(cfg.BybitAPIKey, cfg.BybitAPISecret)
	websocket.Init(bybitClient)
	
	// Start position broadcaster (every 5 seconds)
	go websocket.StartPositionBroadcaster(5 * time.Second)
	log.Printf("Positions WebSocket broadcaster started")

	// Initialize Bybit MarketStreamer (for real-time market data)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	streamer := bybit.NewMarketStreamer(ctx, hub.Broadcast)
	streamer.Start()
	log.Printf("Bybit MarketStreamer started")

	// Create router
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(middleware.Timeout(60 * time.Second))

	// CORS middleware
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"}, // Be permissive for debugging
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	})
	r.Use(c.Handler)

	// Simple health endpoint
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "ok",
			"time":   time.Now().Format(time.RFC3339),
			"bybit_connected": true,
		})
	})

	r.Get("/", rootHandler)

	// WebSocket endpoints
	r.Route("/ws", func(r chi.Router) {
		r.Get("/positions", websocket.WSPositionsHandler)
		// Calculator market data stream
		r.Get("/market", func(w http.ResponseWriter, r *http.Request) {
			websocket.ServeWS(hub, w, r)
		})
	})

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Bybit proxy
		r.Get("/positions", websocket.GetPositionsHandler)
		r.Post("/calculate", calculateHandler)
	})

	server := &http.Server{
		Addr:         ":" + cfg.ServerPort,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("Server listening on port %s", cfg.ServerPort)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("Server failed: %v", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Printf("Shutting down server...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Printf("Server stopped gracefully")
}

func rootHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"service": "Option Pro - Real-time Whale Terminal",
	})
}

func calculateHandler(w http.ResponseWriter, r *http.Request) {
	var req math.MatrixRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "Invalid JSON", err.Error(), http.StatusBadRequest)
		return
	}

	if err := validateRequest(req); err != nil {
		sendError(w, "Validation error", err.Error(), http.StatusBadRequest)
		return
	}

	if req.DaysToExpiry <= 0 {
		req.DaysToExpiry = 30
	}

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

func maskString(s string) string {
	if len(s) < 8 {
		return "****"
	}
	return s[:4] + "****" + s[len(s)-4:]
}
