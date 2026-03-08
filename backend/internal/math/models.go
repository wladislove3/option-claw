package math

// OptionType represents call or put
type OptionType string

const (
	Call OptionType = "CALL"
	Put  OptionType = "PUT"
)

// Side represents long or short position
type Side string

const (
	Long  Side = "LONG"
	Short Side = "SHORT"
)

// OptionLeg represents a single option position
type OptionLeg struct {
	Type     OptionType `json:"type"`
	Side     Side       `json:"side"`
	Strike   float64    `json:"strike"`
	Premium  float64    `json:"premium"`
	Quantity int        `json:"quantity"`
}

// MatrixRequest represents the API request body
type MatrixRequest struct {
	UnderlyingPrice float64     `json:"underlying_price"`
	Volatility      float64     `json:"volatility"`
	RiskFreeRate    float64     `json:"risk_free_rate"`
	DaysToExpiry    int         `json:"days_to_expiry,omitempty"`
	Legs            []OptionLeg `json:"legs"`
}

// MatrixResponse represents the API response
type MatrixResponse struct {
	PriceAxis    []float64 `json:"price_axis"`    // X-axis: price range
	TimeAxis     []float64 `json:"time_axis"`     // Y-axis: time range (days)
	PnLMatrix    [][]float64 `json:"pnl_matrix"`  // 2D P&L values
	MaxProfit    float64   `json:"max_profit"`
	MaxLoss      float64   `json:"max_loss"`
	Breakevens   []float64 `json:"breakevens,omitempty"`
}

// ErrorResponse represents an API error
type ErrorResponse struct {
	Error   string `json:"error"`
	Details string `json:"details,omitempty"`
}
