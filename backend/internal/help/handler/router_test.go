package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNewRouter(t *testing.T) {
	router := NewRouter(nil)
	if router == nil {
		t.Fatal("NewRouter() returned nil")
	}
	if router.chi == nil {
		t.Fatal("NewRouter() chi router is nil")
	}
}

func TestNewRouterWithRateLimiter(t *testing.T) {
	router := NewRouterWithRateLimiter(nil)
	if router == nil {
		t.Fatal("NewRouterWithRateLimiter() returned nil")
	}
}

func TestSimpleHealthEndpoint(t *testing.T) {
	router := NewRouter(nil)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}
}

func TestRootHandler(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	rootHandler(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("Expected Content-Type 'application/json', got '%s'", contentType)
	}
}

func TestRouterEndpoints(t *testing.T) {
	router := NewRouter(nil)

	tests := []struct {
		method         string
		path           string
		expectedStatus int
	}{
		{http.MethodGet, "/health", http.StatusOK},
		{http.MethodGet, "/", http.StatusOK},
		{http.MethodPost, "/api/auth/register", http.StatusNotImplemented},
		{http.MethodPost, "/api/auth/login", http.StatusNotImplemented},
		{http.MethodPost, "/api/auth/refresh", http.StatusNotImplemented},
		{http.MethodGet, "/api/positions/real", http.StatusNotImplemented},
		{http.MethodGet, "/api/positions/virtual", http.StatusNotImplemented},
		{http.MethodPost, "/api/positions/virtual", http.StatusNotImplemented},
		{http.MethodPut, "/api/positions/virtual", http.StatusNotImplemented},
		{http.MethodDelete, "/api/positions/virtual", http.StatusNotImplemented},
		{http.MethodGet, "/api/greeks/portfolio", http.StatusNotImplemented},
		{http.MethodGet, "/api/greeks/position", http.StatusNotImplemented},
		// Alerts endpoints are implemented
		{http.MethodGet, "/api/alerts", http.StatusOK},
		{http.MethodPost, "/api/alerts", http.StatusBadRequest}, // Empty body
		{http.MethodDelete, "/api/alerts/123", http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			resp := w.Result()
			defer resp.Body.Close()

			if resp.StatusCode != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, resp.StatusCode)
			}
		})
	}
}

func TestCORSHeaders(t *testing.T) {
	router := NewRouter(nil)

	req := httptest.NewRequest(http.MethodOptions, "/api/auth/register", nil)
	req.Header.Set("Access-Control-Request-Method", "POST")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		t.Errorf("Expected status 204 for preflight, got %d", resp.StatusCode)
	}

	headers := resp.Header
	if headers.Get("Access-Control-Allow-Origin") != "*" {
		t.Errorf("Expected CORS header '*', got '%s'", headers.Get("Access-Control-Allow-Origin"))
	}
	if headers.Get("Access-Control-Allow-Methods") == "" {
		t.Error("Expected Access-Control-Allow-Methods header")
	}
}

func TestCORSWithActualRequest(t *testing.T) {
	router := NewRouter(nil)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	headers := resp.Header
	if headers.Get("Access-Control-Allow-Origin") != "*" {
		t.Errorf("Expected CORS header '*', got '%s'", headers.Get("Access-Control-Allow-Origin"))
	}
}

func TestRespondJSON(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]string{"key": "value"}

	respondJSON(w, http.StatusOK, data)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("Expected Content-Type 'application/json', got '%s'", contentType)
	}
}
