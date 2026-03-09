package handler

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/user/option-pro/backend/internal/config"
	"github.com/user/option-pro/backend/pkg/bybit"
)

// HealthStatus represents the health status of a component
type HealthStatus string

const (
	// StatusOK - component is healthy
	StatusOK HealthStatus = "ok"
	// StatusDegraded - component is having issues
	StatusDegraded HealthStatus = "degraded"
	// StatusDown - component is unavailable
	StatusDown HealthStatus = "down"
)

// HealthResponse represents the health check response
type HealthResponse struct {
	Status      HealthStatus        `json:"status"`
	Timestamp   time.Time           `json:"timestamp"`
	Components  map[string]ComponentHealth `json:"components"`
	DegradedCount int               `json:"degraded_count"`
}

// ComponentHealth represents the health of a single component
type ComponentHealth struct {
	Status  HealthStatus `json:"status"`
	Message string       `json:"message,omitempty"`
	Latency string       `json:"latency,omitempty"`
}

// HealthChecker performs health checks on dependencies
type HealthChecker struct {
	cfg        *config.Config
	httpClient *http.Client
	mu         sync.Mutex
	lastCheck  *HealthResponse
	cacheTime  time.Time
	cacheTTL   time.Duration
}

// NewHealthChecker creates a new health checker
func NewHealthChecker(cfg *config.Config) *HealthChecker {
	return &HealthChecker{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
		cacheTTL: 5 * time.Second,
	}
}

// Check performs health checks on all dependencies
func (hc *HealthChecker) Check() *HealthResponse {
	hc.mu.Lock()
	defer hc.mu.Unlock()

	// Return cached result if still valid
	if hc.lastCheck != nil && time.Since(hc.cacheTime) < hc.cacheTTL {
		return hc.lastCheck
	}

	response := &HealthResponse{
		Status:     StatusOK,
		Timestamp:  time.Now(),
		Components: make(map[string]ComponentHealth),
	}

	// Check PostgreSQL
	response.Components["postgres"] = hc.checkPostgreSQL()

	// Check Redis
	response.Components["redis"] = hc.checkRedis()

	// Check Bybit API
	response.Components["bybit"] = hc.checkBybitAPI()

	// Calculate overall status
	degradedCount := 0
	for _, comp := range response.Components {
		if comp.Status == StatusDegraded || comp.Status == StatusDown {
			degradedCount++
		}
	}
	response.DegradedCount = degradedCount

	// Overall status is degraded if any component is down/degraded
	if degradedCount > 0 {
		response.Status = StatusDegraded
	}

	hc.lastCheck = response
	hc.cacheTime = time.Now()

	return response
}

// checkPostgreSQL checks PostgreSQL connectivity
func (hc *HealthChecker) checkPostgreSQL() ComponentHealth {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	start := time.Now()

	health := ComponentHealth{
		Status:  StatusOK,
		Message: "PostgreSQL is reachable",
	}

	// Check if we can connect
	if hc.cfg.DBHost == "" {
		health.Status = StatusDown
		health.Message = "PostgreSQL host not configured"
		return health
	}

	// Try TCP connection
	if err := hc.checkTCPConnection(ctx, hc.cfg.DBHost, hc.cfg.DBPort); err != nil {
		health.Status = StatusDown
		health.Message = "PostgreSQL connection failed: " + err.Error()
	}

	health.Latency = time.Since(start).String()
	return health
}

// checkRedis checks Redis connectivity
func (hc *HealthChecker) checkRedis() ComponentHealth {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	start := time.Now()

	health := ComponentHealth{
		Status:  StatusOK,
		Message: "Redis is reachable",
	}

	if hc.cfg.RedisHost == "" {
		health.Status = StatusDown
		health.Message = "Redis host not configured"
		return health
	}

	// Try TCP connection
	if err := hc.checkTCPConnection(ctx, hc.cfg.RedisHost, hc.cfg.RedisPort); err != nil {
		health.Status = StatusDown
		health.Message = "Redis connection failed: " + err.Error()
	}

	health.Latency = time.Since(start).String()
	return health
}

// checkBybitAPI checks Bybit API connectivity
func (hc *HealthChecker) checkBybitAPI() ComponentHealth {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	start := time.Now()

	health := ComponentHealth{
		Status:  StatusOK,
		Message: "Bybit API is reachable",
	}

	// Create Bybit client for health check
	client := bybit.NewClient(&bybit.Config{
		Testnet: true,
		Timeout: 5 * time.Second,
	})

	// Try to get ticker (public endpoint, no auth needed)
	_, err := client.GetTicker("linear", "BTCUSDT")
	if err != nil {
		// Check if it's a timeout or connection error
		if ctx.Err() == context.DeadlineExceeded {
			health.Status = StatusDown
			health.Message = "Bybit API timeout"
		} else {
			// API error but connection works
			health.Status = StatusDegraded
			health.Message = "Bybit API returned error: " + err.Error()
		}
	}

	health.Latency = time.Since(start).String()
	return health
}

// checkTCPConnection checks if a TCP endpoint is reachable
func (hc *HealthChecker) checkTCPConnection(ctx context.Context, host, port string) error {
	dialer := &net.Dialer{}
	conn, err := dialer.DialContext(ctx, "tcp", host+":"+port)
	if err != nil {
		return err
	}
	conn.Close()
	return nil
}

// healthHandler handles health check requests
func healthHandler(hc *HealthChecker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		response := hc.Check()

		statusCode := http.StatusOK
		if response.Status == StatusDegraded {
			statusCode = http.StatusServiceUnavailable
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		json.NewEncoder(w).Encode(response)
	}
}

// simpleHealthHandler is a basic health handler without dependency checks
func simpleHealthHandler(w http.ResponseWriter, r *http.Request) {
	response := map[string]interface{}{
		"status":    "ok",
		"timestamp": time.Now(),
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
