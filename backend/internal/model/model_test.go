package model

import (
	"encoding/json"
	"testing"
	"time"
)

func TestOptionTypeIsValid(t *testing.T) {
	tests := []struct {
		optionType OptionType
		expected   bool
	}{
		{Call, true},
		{Put, true},
		{"call", true},
		{"put", true},
		{"", false},
		{"invalid", false},
	}

	for _, tt := range tests {
		result := tt.optionType.IsValid()
		if result != tt.expected {
			t.Errorf("IsValid() for %q: expected %v, got %v", tt.optionType, tt.expected, result)
		}
	}
}

func TestOptionValidate(t *testing.T) {
	validOption := &Option{
		Symbol:     "BTC-31DEC24-50000-C",
		Strike:     50000,
		Expiration: time.Now().Add(30 * 24 * time.Hour),
		Type:       Call,
		Underlying: "BTC",
	}

	if err := validOption.Validate(); err != nil {
		t.Errorf("Expected valid option, got error: %v", err)
	}

	invalidSymbol := &Option{
		Symbol:     "",
		Strike:     50000,
		Expiration: time.Now(),
		Type:       Call,
		Underlying: "BTC",
	}
	if err := invalidSymbol.Validate(); err != ErrEmptySymbol {
		t.Errorf("Expected ErrEmptySymbol, got: %v", err)
	}

	invalidStrike := &Option{
		Symbol:     "BTC-50000-C",
		Strike:     -100,
		Expiration: time.Now(),
		Type:       Call,
		Underlying: "BTC",
	}
	if err := invalidStrike.Validate(); err != ErrInvalidStrike {
		t.Errorf("Expected ErrInvalidStrike, got: %v", err)
	}

	invalidType := &Option{
		Symbol:     "BTC-50000-C",
		Strike:     50000,
		Expiration: time.Now(),
		Type:       "invalid",
		Underlying: "BTC",
	}
	if err := invalidType.Validate(); err != ErrInvalidOptionType {
		t.Errorf("Expected ErrInvalidOptionType, got: %v", err)
	}
}

func TestPositionLegValidate(t *testing.T) {
	validLeg := &PositionLeg{
		Option: Option{
			Symbol:     "BTC-50000-C",
			Strike:     50000,
			Expiration: time.Now(),
			Type:       Call,
			Underlying: "BTC",
		},
		Quantity:   10,
		EntryPrice: 100.5,
	}

	if err := validLeg.Validate(); err != nil {
		t.Errorf("Expected valid leg, got error: %v", err)
	}

	invalidQuantity := &PositionLeg{
		Option: Option{
			Symbol:     "BTC-50000-C",
			Strike:     50000,
			Expiration: time.Now(),
			Type:       Call,
			Underlying: "BTC",
		},
		Quantity:   0,
		EntryPrice: 100.5,
	}
	if err := invalidQuantity.Validate(); err != ErrInvalidQuantity {
		t.Errorf("Expected ErrInvalidQuantity, got: %v", err)
	}

	negativePrice := &PositionLeg{
		Option: Option{
			Symbol:     "BTC-50000-C",
			Strike:     50000,
			Expiration: time.Now(),
			Type:       Call,
			Underlying: "BTC",
		},
		Quantity:   10,
		EntryPrice: -50,
	}
	if err := negativePrice.Validate(); err != ErrInvalidEntryPrice {
		t.Errorf("Expected ErrInvalidEntryPrice, got: %v", err)
	}
}

func TestPositionValidate(t *testing.T) {
	validPosition := &Position{
		ID:     "pos-123",
		UserID: "user-456",
		Legs: []PositionLeg{
			{
				Option: Option{
					Symbol:     "BTC-50000-C",
					Strike:     50000,
					Expiration: time.Now(),
					Type:       Call,
					Underlying: "BTC",
				},
				Quantity:   10,
				EntryPrice: 100.5,
			},
		},
		Underlying: "BTC",
		Direction:  "long",
	}

	if err := validPosition.Validate(); err != nil {
		t.Errorf("Expected valid position, got error: %v", err)
	}

	emptyID := &Position{
		ID:     "",
		UserID: "user-456",
		Legs:   []PositionLeg{},
	}
	if err := emptyID.Validate(); err == nil {
		t.Error("Expected error for empty ID")
	}

	emptyLegs := &Position{
		ID:     "pos-123",
		UserID: "user-456",
		Legs:   []PositionLeg{},
	}
	if err := emptyLegs.Validate(); err != ErrInvalidLegs {
		t.Errorf("Expected ErrInvalidLegs, got: %v", err)
	}
}

func TestPortfolioValidate(t *testing.T) {
	validPortfolio := &Portfolio{
		UserID: "user-456",
		Positions: []Position{
			{
				ID:     "pos-123",
				UserID: "user-456",
				Legs: []PositionLeg{
					{
						Option: Option{
							Symbol:     "BTC-50000-C",
							Strike:     50000,
							Expiration: time.Now(),
							Type:       Call,
							Underlying: "BTC",
						},
						Quantity:   10,
						EntryPrice: 100.5,
					},
				},
			},
		},
	}

	if err := validPortfolio.Validate(); err != nil {
		t.Errorf("Expected valid portfolio, got error: %v", err)
	}

	emptyUserID := &Portfolio{
		UserID: "",
		Positions: []Position{
			{
				ID:     "pos-123",
				UserID: "user-456",
				Legs: []PositionLeg{
					{
						Option: Option{
							Symbol:     "BTC-50000-C",
							Strike:     50000,
							Expiration: time.Now(),
							Type:       Call,
							Underlying: "BTC",
						},
						Quantity:   10,
					},
				},
			},
		},
	}
	if err := emptyUserID.Validate(); err == nil {
		t.Error("Expected error for empty user ID")
	}
}

func TestOptionJSONSerialization(t *testing.T) {
	option := &Option{
		Symbol:     "BTC-31DEC24-50000-C",
		Strike:     50000.00,
		Expiration: time.Date(2024, 12, 31, 0, 0, 0, 0, time.UTC),
		Type:       Call,
		Underlying: "BTC",
	}

	data, err := json.Marshal(option)
	if err != nil {
		t.Fatalf("Marshal failed: %v", err)
	}

	var decoded Option
	err = json.Unmarshal(data, &decoded)
	if err != nil {
		t.Fatalf("Unmarshal failed: %v", err)
	}

	if decoded.Symbol != option.Symbol {
		t.Errorf("Symbol mismatch: expected %s, got %s", option.Symbol, decoded.Symbol)
	}
	if decoded.Strike != option.Strike {
		t.Errorf("Strike mismatch: expected %f, got %f", option.Strike, decoded.Strike)
	}
	if decoded.Type != option.Type {
		t.Errorf("Type mismatch: expected %s, got %s", option.Type, decoded.Type)
	}
}

func TestPositionJSONSerialization(t *testing.T) {
	position := &Position{
		ID:     "pos-123",
		UserID: "user-456",
		Legs: []PositionLeg{
			{
				Option: Option{
					Symbol:     "BTC-50000-C",
					Strike:     50000,
					Expiration: time.Now(),
					Type:       Call,
					Underlying: "BTC",
				},
				Quantity:   10,
				EntryPrice: 100.5,
			},
		},
		Underlying: "BTC",
		Direction:  "long",
	}

	data, err := json.Marshal(position)
	if err != nil {
		t.Fatalf("Marshal failed: %v", err)
	}

	var decoded Position
	err = json.Unmarshal(data, &decoded)
	if err != nil {
		t.Fatalf("Unmarshal failed: %v", err)
	}

	if decoded.ID != position.ID {
		t.Errorf("ID mismatch: expected %s, got %s", position.ID, decoded.ID)
	}
	if len(decoded.Legs) != len(position.Legs) {
		t.Errorf("Legs count mismatch: expected %d, got %d", len(position.Legs), len(decoded.Legs))
	}
}

func TestPortfolioJSONSerialization(t *testing.T) {
	portfolio := &Portfolio{
		UserID:     "user-456",
		Positions:  []Position{},
		TotalPnL:   1500.50,
		TotalDelta: 0.25,
		TotalGamma: 0.05,
		TotalTheta: -10.5,
		TotalVega:  25.0,
	}

	data, err := json.Marshal(portfolio)
	if err != nil {
		t.Fatalf("Marshal failed: %v", err)
	}

	var decoded Portfolio
	err = json.Unmarshal(data, &decoded)
	if err != nil {
		t.Fatalf("Unmarshal failed: %v", err)
	}

	if decoded.UserID != portfolio.UserID {
		t.Errorf("UserID mismatch: expected %s, got %s", portfolio.UserID, decoded.UserID)
	}
	if decoded.TotalPnL != portfolio.TotalPnL {
		t.Errorf("TotalPnL mismatch: expected %f, got %f", portfolio.TotalPnL, decoded.TotalPnL)
	}
}
