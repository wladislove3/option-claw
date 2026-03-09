package handler

import (
	"encoding/json"
	"net/http"
	"github.com/user/option-pro/backend/internal/auth"
	"github.com/user/option-pro/backend/pkg/bybit"
	"github.com/user/option-pro/backend/pkg/crypto"
)

type AuthHandler struct {
	authManager   *auth.JWTManager
	encryptor     *crypto.Encryptor
	secretKey     string
}

type RegisterRequest struct {
	TelegramID string `json:"telegram_id"`
	APIKey     string `json:"api_key"`
	APISecret  string `json:"api_secret"`
}

type LoginRequest struct {
	TelegramID string `json:"telegram_id"`
}

type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	UserID       string `json:"user_id"`
}

func NewAuthHandler(secretKey string) *AuthHandler {
	authManager := auth.DefaultJWTManager(secretKey)
	encryptor, _ := crypto.NewEncryptorFromString(secretKey)
	return &AuthHandler{
		authManager: authManager,
		encryptor:   encryptor,
		secretKey:   secretKey,
	}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.TelegramID == "" || req.APIKey == "" || req.APISecret == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// Validate Bybit API keys (testnet)
	client := bybit.NewClient(&bybit.Config{
		APIKey:    req.APIKey,
		APISecret: req.APISecret,
		Testnet:   true,
	})

	_, err := client.GetPositions("linear")
	if err != nil {
		http.Error(w, "Invalid Bybit API credentials", http.StatusUnauthorized)
		return
	}

	// Encrypt API secret
	encryptedSecret, err := h.encryptor.Encrypt(req.APISecret)
	if err != nil {
		http.Error(w, "Failed to encrypt credentials", http.StatusInternalServerError)
		return
	}

	// Store encrypted credentials (in real app, save to database)
	_ = encryptedSecret

	// Generate JWT tokens
	accessToken, refreshToken, err := h.authManager.GenerateToken(req.TelegramID, req.TelegramID)
	if err != nil {
		http.Error(w, "Failed to generate tokens", http.StatusInternalServerError)
		return
	}

	resp := AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		UserID:       req.TelegramID,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.TelegramID == "" {
		http.Error(w, "Missing telegram_id", http.StatusBadRequest)
		return
	}

	// Generate JWT tokens (in real app, verify user exists in database)
	accessToken, refreshToken, err := h.authManager.GenerateToken(req.TelegramID, req.TelegramID)
	if err != nil {
		http.Error(w, "Failed to generate tokens", http.StatusInternalServerError)
		return
	}

	resp := AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		UserID:       req.TelegramID,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		RefreshToken string `json:"refresh_token"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	newAccessToken, newRefreshToken, err := h.authManager.RefreshToken(req.RefreshToken)
	if err != nil {
		http.Error(w, "Invalid refresh token", http.StatusUnauthorized)
		return
	}

	resp := AuthResponse{
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
