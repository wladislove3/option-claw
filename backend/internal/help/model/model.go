package model

import (
	"errors"
	"time"
)

var (
	ErrInvalidStrike     = errors.New("invalid strike price: must be positive")
	ErrInvalidQuantity   = errors.New("invalid quantity: must be non-zero")
	ErrInvalidEntryPrice = errors.New("invalid entry price: must be non-negative")
	ErrInvalidOptionType = errors.New("invalid option type: must be call or put")
	ErrEmptySymbol       = errors.New("symbol cannot be empty")
	ErrInvalidLegs       = errors.New("position must have at least one leg")
)

type OptionType string

const (
	Call OptionType = "call"
	Put  OptionType = "put"
)

func (o OptionType) IsValid() bool {
	return o == Call || o == Put
}

type Option struct {
	Symbol     string     `json:"symbol"`
	Strike     float64    `json:"strike"`
	Expiration time.Time  `json:"expiration"`
	Type       OptionType `json:"type"`
	Underlying string     `json:"underlying"`
}

func (o *Option) Validate() error {
	if o.Symbol == "" {
		return ErrEmptySymbol
	}
	if o.Strike <= 0 {
		return ErrInvalidStrike
	}
	if !o.Type.IsValid() {
		return ErrInvalidOptionType
	}
	if o.Underlying == "" {
		return ErrEmptySymbol
	}
	return nil
}

type PositionLeg struct {
	Option     Option  `json:"option"`
	Quantity   int     `json:"quantity"`
	EntryPrice float64 `json:"entry_price"`
}

func (l *PositionLeg) Validate() error {
	if err := l.Option.Validate(); err != nil {
		return err
	}
	if l.Quantity == 0 {
		return ErrInvalidQuantity
	}
	if l.EntryPrice < 0 {
		return ErrInvalidEntryPrice
	}
	return nil
}

type Position struct {
	ID         string        `json:"id"`
	UserID     string        `json:"user_id"`
	Legs       []PositionLeg `json:"legs"`
	Underlying string        `json:"underlying"`
	Direction  string        `json:"direction"`
	DeletedAt  time.Time     `json:"deleted_at,omitempty"`
	CreatedAt  time.Time     `json:"created_at"`
	UpdatedAt  time.Time     `json:"updated_at"`
}

func (p *Position) Validate() error {
	if p.ID == "" {
		return ErrEmptySymbol
	}
	if p.UserID == "" {
		return ErrEmptySymbol
	}
	if len(p.Legs) == 0 {
		return ErrInvalidLegs
	}
	for _, leg := range p.Legs {
		if err := leg.Validate(); err != nil {
			return err
		}
	}
	return nil
}

type Portfolio struct {
	UserID      string     `json:"user_id"`
	Positions   []Position `json:"positions"`
	TotalPnL    float64    `json:"total_pnl"`
	TotalDelta  float64    `json:"total_delta"`
	TotalGamma  float64    `json:"total_gamma"`
	TotalTheta  float64    `json:"total_theta"`
	TotalVega   float64    `json:"total_vega"`
}

func (pf *Portfolio) Validate() error {
	if pf.UserID == "" {
		return ErrEmptySymbol
	}
	for _, pos := range pf.Positions {
		if err := pos.Validate(); err != nil {
			return err
		}
	}
	return nil
}
