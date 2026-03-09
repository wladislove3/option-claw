package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token has expired")
)

type Claims struct {
	UserID     string `json:"user_id"`
	TelegramID string `json:"telegram_id"`
	jwt.RegisteredClaims
}

type JWTManager struct {
	secretKey      string
	tokenDuration  time.Duration
	refreshDuration time.Duration
}

func NewJWTManager(secretKey string, tokenDuration, refreshDuration time.Duration) *JWTManager {
	return &JWTManager{
		secretKey:       secretKey,
		tokenDuration:   tokenDuration,
		refreshDuration: refreshDuration,
	}
}

func DefaultJWTManager(secretKey string) *JWTManager {
	return NewJWTManager(
		secretKey,
		24*time.Hour,  // Access token TTL
		7*24*time.Hour, // Refresh token TTL
	)
}

func (m *JWTManager) GenerateToken(userID, telegramID string) (string, string, error) {
	// Access token
	accessToken, err := m.generateAccessToken(userID, telegramID)
	if err != nil {
		return "", "", err
	}

	// Refresh token
	refreshToken, err := m.generateRefreshToken(userID, telegramID)
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

func (m *JWTManager) generateAccessToken(userID, telegramID string) (string, error) {
	claims := &Claims{
		UserID:     userID,
		TelegramID: telegramID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(m.tokenDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "optionstrategist",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(m.secretKey))
}

func (m *JWTManager) generateRefreshToken(userID, telegramID string) (string, error) {
	claims := &Claims{
		UserID:     userID,
		TelegramID: telegramID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(m.refreshDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "optionstrategist",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(m.secretKey))
}

func (m *JWTManager) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(m.secretKey), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	// Check expiration
	if claims.ExpiresAt.Before(time.Now()) {
		return nil, ErrExpiredToken
	}

	return claims, nil
}

func (m *JWTManager) RefreshToken(refreshToken string) (string, string, error) {
	// Validate refresh token
	claims, err := m.ValidateToken(refreshToken)
	if err != nil {
		return "", "", err
	}

	// Generate new tokens
	return m.GenerateToken(claims.UserID, claims.TelegramID)
}
