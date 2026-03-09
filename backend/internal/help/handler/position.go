package handler

import (
	"encoding/json"
	"net/http"
	"github.com/user/option-pro/backend/internal/auth"
	"github.com/user/option-pro/backend/internal/model"
	"github.com/user/option-pro/backend/pkg/bybit"
	"github.com/user/option-pro/backend/pkg/crypto"
	"github.com/user/option-pro/backend/pkg/greeks"
	"github.com/user/option-pro/backend/pkg/pnl"
	"time"
)

type PositionHandler struct {
	bybitClient *bybit.Client
	encryptor   *crypto.Encryptor
	// In-memory store for demo (replace with database in production)
	virtualPositions map[string]*model.Position
}

type VirtualPositionRequest struct {
	Legs       []model.PositionLeg `json:"legs"`
	Underlying string              `json:"underlying"`
	Quantity   int                 `json:"quantity"`
	Name       string              `json:"name,omitempty"`
}

type PositionResponse struct {
	ID            string              `json:"id"`
	UserID        string              `json:"user_id"`
	Legs          []model.PositionLeg `json:"legs"`
	Underlying    string              `json:"underlying"`
	Direction     string              `json:"direction"`
	UnrealizedPnL float64             `json:"unrealized_pnl"`
	Delta         float64             `json:"delta"`
	Gamma         float64             `json:"gamma"`
	Theta         float64             `json:"theta"`
	Vega          float64             `json:"vega"`
	CreatedAt     time.Time           `json:"created_at"`
	UpdatedAt     time.Time           `json:"updated_at"`
}

func NewPositionHandler(secretKey string) *PositionHandler {
	encryptor, _ := crypto.NewEncryptorFromString(secretKey)
	return &PositionHandler{
		encryptor:        encryptor,
		virtualPositions: make(map[string]*model.Position),
	}
}

// GetRealPositions - TASK-019: Get real positions from Bybit
func (h *PositionHandler) GetRealPositions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get user from context
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// In real app: get encrypted API keys from database for userID
	// Decrypt and create Bybit client
	client := bybit.NewClient(&bybit.Config{
		Testnet: true,
	})

	positions, err := client.GetPositions("linear")
	if err != nil {
		http.Error(w, "Failed to fetch positions", http.StatusInternalServerError)
		return
	}

	// Convert to response format
	resp := make([]PositionResponse, len(positions))
	for i, pos := range positions {
		resp[i] = PositionResponse{
			ID:         pos.Symbol,
			UserID:     userID,
			Underlying: pos.Symbol,
			Direction:  pos.Side,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// CreateVirtualPosition - TASK-020: Create virtual position
func (h *PositionHandler) CreateVirtualPosition(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req VirtualPositionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate: sum of legs should be 0 for hedged position
	totalQty := 0
	for _, leg := range req.Legs {
		totalQty += leg.Quantity
	}

	if totalQty != 0 && len(req.Legs) > 1 {
		http.Error(w, "Invalid position: legs must sum to 0 for hedged position", http.StatusBadRequest)
		return
	}

	if len(req.Legs) == 0 {
		http.Error(w, "Position must have at least one leg", http.StatusBadRequest)
		return
	}

	// Determine direction
	direction := "long"
	if totalQty < 0 {
		direction = "short"
	}

	// Create virtual position
	position := model.Position{
		ID:         generatePositionID(),
		UserID:     userID,
		Legs:       req.Legs,
		Underlying: req.Underlying,
		Direction:  direction,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	// In real app: save to database

	resp := PositionResponse{
		ID:         position.ID,
		UserID:     position.UserID,
		Legs:       position.Legs,
		Underlying: position.Underlying,
		Direction:  position.Direction,
		CreatedAt:  position.CreatedAt,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resp)
}

// GetVirtualPositions - TASK-023: Get all virtual positions for user with Greeks and P&L
func (h *PositionHandler) GetVirtualPositions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get pagination params
	limit := 10
	offset := 0

	// Filter positions by user
	var userPositions []*model.Position
	for _, pos := range h.virtualPositions {
		if pos.UserID == userID && pos.DeletedAt.IsZero() {
			userPositions = append(userPositions, pos)
		}
	}

	// Apply pagination
	start := offset
	if start > len(userPositions) {
		start = len(userPositions)
	}
	end := start + limit
	if end > len(userPositions) {
		end = len(userPositions)
	}

	// Build response with Greeks and P&L
	resp := make([]PositionResponse, 0)
	spotPrice := 50000.0 // In real app, get from market data

	for _, pos := range userPositions[start:end] {
		posResp := h.buildPositionResponse(pos, spotPrice)
		resp = append(resp, posResp)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"positions": resp,
		"total":     len(userPositions),
		"limit":     limit,
		"offset":    offset,
	})
}

// UpdateVirtualPosition - TASK-021: Update virtual position
func (h *PositionHandler) UpdateVirtualPosition(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Extract position ID from URL path (in real app using router)
	// For demo, read from request body
	var req struct {
		ID       string              `json:"id"`
		Legs     []model.PositionLeg `json:"legs"`
		Quantity int                 `json:"quantity"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ID == "" {
		http.Error(w, "Position ID required", http.StatusBadRequest)
		return
	}

	// Find position
	pos, exists := h.virtualPositions[req.ID]
	if !exists || pos.UserID != userID {
		http.Error(w, "Position not found", http.StatusNotFound)
		return
	}

	// Update fields
	if len(req.Legs) > 0 {
		pos.Legs = req.Legs
	}
	if req.Quantity != 0 {
		for i := range pos.Legs {
			pos.Legs[i].Quantity = req.Quantity
		}
	}
	pos.UpdatedAt = time.Now()

	// Recalculate Greeks and P&L (done on read)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "updated", "id": pos.ID})
}

// DeleteVirtualPosition - TASK-022: Soft delete virtual position
func (h *PositionHandler) DeleteVirtualPosition(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Extract position ID from URL path (in real app using router)
	positionID := r.URL.Query().Get("id")
	if positionID == "" {
		http.Error(w, "Position ID required", http.StatusBadRequest)
		return
	}

	// Find position
	pos, exists := h.virtualPositions[positionID]
	if !exists || pos.UserID != userID {
		http.Error(w, "Position not found", http.StatusNotFound)
		return
	}

	// Soft delete: set deleted_at timestamp
	pos.DeletedAt = time.Now()

	w.WriteHeader(http.StatusNoContent)
}

func generatePositionID() string {
	return "pos-" + time.Now().Format("20060102150405")
}

// buildPositionResponse builds response with Greeks and P&L
func (h *PositionHandler) buildPositionResponse(pos *model.Position, spotPrice float64) PositionResponse {
	// Calculate P&L
	unrealizedPnL := pnl.CalculateUnrealizedPnL(pos, spotPrice)

	// Calculate Greeks
	posGreeks := greeks.CalculatePositionGreeks(pos, spotPrice)

	return PositionResponse{
		ID:            pos.ID,
		UserID:        pos.UserID,
		Legs:          pos.Legs,
		Underlying:    pos.Underlying,
		Direction:     pos.Direction,
		UnrealizedPnL: unrealizedPnL,
		Delta:         posGreeks.Delta,
		Gamma:         posGreeks.Gamma,
		Theta:         posGreeks.Theta,
		Vega:          posGreeks.Vega,
		CreatedAt:     pos.CreatedAt,
		UpdatedAt:     pos.UpdatedAt,
	}
}
