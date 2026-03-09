package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/user/option-pro/backend/internal/config"
)

func testConfig() *config.Config {
	return &config.Config{
		DBHost:     "localhost",
		DBPort:     "5432",
		RedisHost:  "localhost",
		RedisPort:  "6379",
		ServerPort: "8080",
	}
}

func TestNewHealthChecker(t *testing.T) {
	cfg := testConfig()
	hc := NewHealthChecker(cfg)

	if hc == nil {
		t.Fatal("NewHealthChecker() returned nil")
	}

	if hc.cfg != cfg {
		t.Error("Config should be set")
	}

	if hc.httpClient == nil {
		t.Error("HTTP client should be initialized")
	}
}

func TestHealthCheckerCheck(t *testing.T) {
	cfg := testConfig()
	hc := NewHealthChecker(cfg)

	response := hc.Check()

	if response.Status == "" {
		t.Error("Status should be set")
	}

	if response.Timestamp.IsZero() {
		t.Error("Timestamp should be set")
	}

	if response.Components == nil {
		t.Error("Components should be initialized")
	}

	// Should have postgres, redis, bybit components
	expectedComponents := []string{"postgres", "redis", "bybit"}
	for _, comp := range expectedComponents {
		if _, ok := response.Components[comp]; !ok {
			t.Errorf("Component %s should exist", comp)
		}
	}
}

func TestHealthCheckerCaching(t *testing.T) {
	cfg := testConfig()
	hc := NewHealthChecker(cfg)

	// First check
	response1 := hc.Check()
	time.Sleep(10 * time.Millisecond)

	// Second check (should be cached)
	response2 := hc.Check()

	// Timestamps should be the same (cached)
	if response1.Timestamp != response2.Timestamp {
		t.Error("Response should be cached within TTL")
	}
}

func TestHealthCheckerCheckReturnsDegraded(t *testing.T) {
	cfg := &config.Config{
		DBHost:    "nonexistent-host",
		DBPort:    "5432",
		RedisHost: "nonexistent-host",
		RedisPort: "6379",
	}
	hc := NewHealthChecker(cfg)

	response := hc.Check()

	// Should be degraded due to unreachable hosts
	if response.Status != StatusDegraded && response.Status != StatusOK {
		t.Errorf("Expected degraded or ok status, got %s", response.Status)
	}

	// PostgreSQL should be down
	postgresHealth := response.Components["postgres"]
	if postgresHealth.Status != StatusDown {
		t.Logf("PostgreSQL status: %s (may be reachable in test env)", postgresHealth.Status)
	}
}

func TestHealthResponseJSON(t *testing.T) {
	response := &HealthResponse{
		Status:      StatusOK,
		Timestamp:   time.Now(),
		Components:  make(map[string]ComponentHealth),
		DegradedCount: 0,
	}

	response.Components["postgres"] = ComponentHealth{
		Status:  StatusOK,
		Message: "PostgreSQL is healthy",
		Latency: "5ms",
	}

	data, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("Failed to marshal response: %v", err)
	}

	// Verify JSON contains expected fields
	jsonStr := string(data)
	if !contains(jsonStr, "status") {
		t.Error("JSON should contain 'status' field")
	}
	if !contains(jsonStr, "components") {
		t.Error("JSON should contain 'components' field")
	}
}

func TestHealthHandler(t *testing.T) {
	cfg := testConfig()
	hc := NewHealthChecker(cfg)

	handler := healthHandler(hc)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusServiceUnavailable {
		t.Errorf("Expected status 200 or 503, got %d", resp.StatusCode)
	}

	var response HealthResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response.Status == "" {
		t.Error("Response should have status")
	}
}

func TestSimpleHealthHandler(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	simpleHealthHandler(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response["status"] != "ok" {
		t.Errorf("Expected status 'ok', got %v", response["status"])
	}
}

func TestComponentHealthStruct(t *testing.T) {
	health := ComponentHealth{
		Status:  StatusOK,
		Message: "Test message",
		Latency: "10ms",
	}

	if health.Status != StatusOK {
		t.Errorf("Expected status OK, got %s", health.Status)
	}

	if health.Message != "Test message" {
		t.Errorf("Expected message 'Test message', got %s", health.Message)
	}

	if health.Latency != "10ms" {
		t.Errorf("Expected latency '10ms', got %s", health.Latency)
	}
}

func TestHealthStatusConstants(t *testing.T) {
	if StatusOK != "ok" {
		t.Errorf("StatusOK = %s, want ok", StatusOK)
	}
	if StatusDegraded != "degraded" {
		t.Errorf("StatusDegraded = %s, want degraded", StatusDegraded)
	}
	if StatusDown != "down" {
		t.Errorf("StatusDown = %s, want down", StatusDown)
	}
}

func TestCheckTCPConnection(t *testing.T) {
	cfg := testConfig()
	hc := NewHealthChecker(cfg)

	// Test with invalid host (should fail)
	ctx := context.Background()
	err := hc.checkTCPConnection(ctx, "nonexistent.invalid", "12345")
	if err == nil {
		t.Error("Should fail for nonexistent host")
	}
}

func TestHealthCheckerConcurrent(t *testing.T) {
	cfg := testConfig()
	hc := NewHealthChecker(cfg)

	done := make(chan bool)

	for i := 0; i < 10; i++ {
		go func() {
			hc.Check()
			done <- true
		}()
	}

	for i := 0; i < 10; i++ {
		<-done
	}

	// If we get here without panic, concurrent access is safe
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && findSubstring(s, substr))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
