package auth

import (
	"testing"
	"time"
)

func TestNewJWTManager(t *testing.T) {
	manager := DefaultJWTManager("test-secret")

	if manager.secretKey != "test-secret" {
		t.Errorf("Expected secretKey test-secret, got %s", manager.secretKey)
	}

	if manager.tokenDuration != 24*time.Hour {
		t.Errorf("Expected tokenDuration 24h, got %v", manager.tokenDuration)
	}

	if manager.refreshDuration != 7*24*time.Hour {
		t.Errorf("Expected refreshDuration 168h, got %v", manager.refreshDuration)
	}
}

func TestGenerateToken(t *testing.T) {
	manager := DefaultJWTManager("test-secret")

	accessToken, refreshToken, err := manager.GenerateToken("user-123", "tg-456")
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	if accessToken == "" {
		t.Error("Expected non-empty access token")
	}

	if refreshToken == "" {
		t.Error("Expected non-empty refresh token")
	}

	// Tokens should be different
	if accessToken == refreshToken {
		t.Error("Access and refresh tokens should be different")
	}
}

func TestValidateToken(t *testing.T) {
	manager := DefaultJWTManager("test-secret")

	accessToken, _, err := manager.GenerateToken("user-123", "tg-456")
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	claims, err := manager.ValidateToken(accessToken)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}

	if claims.UserID != "user-123" {
		t.Errorf("Expected UserID user-123, got %s", claims.UserID)
	}

	if claims.TelegramID != "tg-456" {
		t.Errorf("Expected TelegramID tg-456, got %s", claims.TelegramID)
	}
}

func TestValidateInvalidToken(t *testing.T) {
	manager := DefaultJWTManager("test-secret")

	_, err := manager.ValidateToken("invalid-token")
	if err == nil {
		t.Error("Expected error for invalid token")
	}
}

func TestValidateWrongSecret(t *testing.T) {
	manager1 := DefaultJWTManager("secret-1")
	manager2 := DefaultJWTManager("secret-2")

	token, _, _ := manager1.GenerateToken("user-123", "tg-456")

	_, err := manager2.ValidateToken(token)
	if err == nil {
		t.Error("Expected error for token signed with different secret")
	}
}

func TestRefreshToken(t *testing.T) {
	manager := DefaultJWTManager("test-secret")

	_, refreshToken, err := manager.GenerateToken("user-123", "tg-456")
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	newAccessToken, newRefreshToken, err := manager.RefreshToken(refreshToken)
	if err != nil {
		t.Fatalf("RefreshToken failed: %v", err)
	}

	if newAccessToken == "" {
		t.Error("Expected non-empty new access token")
	}

	if newRefreshToken == "" {
		t.Error("Expected non-empty new refresh token")
	}
}

func TestRefreshInvalidToken(t *testing.T) {
	manager := DefaultJWTManager("test-secret")

	_, _, err := manager.RefreshToken("invalid-refresh-token")
	if err == nil {
		t.Error("Expected error for invalid refresh token")
	}
}

func TestTokenExpiration(t *testing.T) {
	// Create manager with very short token duration
	manager := NewJWTManager("test-secret", 1*time.Second, 7*24*time.Hour)

	accessToken, _, err := manager.GenerateToken("user-123", "tg-456")
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	// Token should be valid immediately
	_, err = manager.ValidateToken(accessToken)
	if err != nil {
		t.Errorf("Token should be valid immediately: %v", err)
	}

	// Wait for expiration
	time.Sleep(2 * time.Second)

	// Token should be expired
	_, err = manager.ValidateToken(accessToken)
	if err == nil {
		t.Error("Expected error for expired token")
	}
}

func TestCustomTokenDuration(t *testing.T) {
	manager := NewJWTManager("test-secret", 10*time.Second, 20*time.Second)

	accessToken, refreshToken, err := manager.GenerateToken("user-123", "tg-456")
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	// Both should be valid
	_, err = manager.ValidateToken(accessToken)
	if err != nil {
		t.Errorf("Access token should be valid: %v", err)
	}

	_, err = manager.ValidateToken(refreshToken)
	if err != nil {
		t.Errorf("Refresh token should be valid: %v", err)
	}
}
