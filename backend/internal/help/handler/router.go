package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/user/option-pro/backend/pkg/metrics"
	"github.com/user/option-pro/backend/pkg/ratelimit"
)

// Router holds the chi router and provides access to routes
type Router struct {
	chi         *chi.Mux
	rateLimiter *ratelimit.RateLimiter
	metrics     *metrics.Metrics
}

// RouterConfig holds router configuration
type RouterConfig struct {
	RateLimiter  *ratelimit.RateLimiter
	Metrics      *metrics.Metrics
	HealthChecker *HealthChecker
}

// NewRouter creates a new router with all middleware and routes configured
func NewRouter(cfg *RouterConfig) *Router {
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)

	// CORS middleware
	r.Use(CORS)

	// Rate limiting middleware (if configured)
	if cfg != nil && cfg.RateLimiter != nil {
		r.Use(RateLimitMiddleware(cfg.RateLimiter))
	}

	// Metrics middleware (if configured)
	if cfg != nil && cfg.Metrics != nil {
		r.Use(cfg.Metrics.Middleware)
	}

	// Health endpoint
	if cfg != nil && cfg.HealthChecker != nil {
		r.Get("/health", healthHandler(cfg.HealthChecker))
	} else {
		r.Get("/health", simpleHealthHandler)
	}
	r.Get("/", rootHandler)

	// Prometheus metrics endpoint
	r.Get("/metrics", func(w http.ResponseWriter, r *http.Request) {
		if cfg != nil && cfg.Metrics != nil {
			cfg.Metrics.Handler().ServeHTTP(w, r)
		} else {
			http.Error(w, "Metrics not configured", http.StatusServiceUnavailable)
		}
	})

	// WebSocket endpoints
	r.Route("/ws", func(r chi.Router) {
		r.Get("/positions", wsPositionsHandler)
		r.Get("/greeks", wsGreeksHandler)
	})

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Auth routes
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", registerHandler)
			r.Post("/login", loginHandler)
			r.Post("/refresh", refreshTokenHandler)
		})

		// Positions routes
		r.Route("/positions", func(r chi.Router) {
			r.Get("/real", getRealPositionsHandler)
			r.Get("/virtual", getVirtualPositionsHandler)
			r.Post("/virtual", createVirtualPositionHandler)
			r.Put("/virtual", updateVirtualPositionHandler)
			r.Delete("/virtual", deleteVirtualPositionHandler)
		})

		// Greeks routes
		r.Route("/greeks", func(r chi.Router) {
			r.Get("/portfolio", getPortfolioGreeksHandler)
			r.Get("/position", getPositionGreeksHandler)
		})

		// Alerts routes
		r.Route("/alerts", func(r chi.Router) {
			r.Get("/", listAlertsHandler)
			r.Post("/", createAlertHandler)
			r.Delete("/{id}", deleteAlertHandler)
		})
	})

	return &Router{
		chi:         r,
		rateLimiter: nil,
	}
}

// NewRouterWithRateLimiter creates a new router with rate limiting enabled
func NewRouterWithRateLimiter(limiter *ratelimit.RateLimiter) *Router {
	return NewRouter(&RouterConfig{
		RateLimiter: limiter,
	})
}

// ServeHTTP implements http.Handler interface
func (rt *Router) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	rt.chi.ServeHTTP(w, r)
}

// GetRouter returns the underlying chi router
func (rt *Router) GetRouter() *chi.Mux {
	return rt.chi
}

// GetRateLimiter returns the rate limiter instance
func (rt *Router) GetRateLimiter() *ratelimit.RateLimiter {
	return rt.rateLimiter
}

// GetMetrics returns the metrics instance
func (rt *Router) GetMetrics() *metrics.Metrics {
	return rt.metrics
}
