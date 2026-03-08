package math

import (
	"math"
	"testing"
)

// TestBlackScholesCallPrice tests call option pricing
func TestBlackScholesCallPrice(t *testing.T) {
	// Test case: ATM call, S=3500, K=3500, T=0.1 (36.5 days), IV=0.5, r=0.05
	S := 3500.0
	K := 3500.0
	T := 0.1
	sigma := 0.5
	r := 0.05

	price := BlackScholesPrice(S, K, T, sigma, r, Call)

	// Expected price for ATM call with high IV (50%) and ~36 days to expiry
	// Higher volatility = higher option price
	expectedMin := 200.0
	expectedMax := 260.0

	if price < expectedMin || price > expectedMax {
		t.Errorf("Call price %v outside expected range [%v, %v]", price, expectedMin, expectedMax)
	}

	t.Logf("Call price: %.2f (S=%.0f, K=%.0f, T=%.2f, IV=%.2f)", price, S, K, T, sigma)
}

// TestBlackScholesPutPrice tests put option pricing
func TestBlackScholesPutPrice(t *testing.T) {
	// Test case: ATM put, same parameters
	S := 3500.0
	K := 3500.0
	T := 0.1
	sigma := 0.5
	r := 0.05

	price := BlackScholesPrice(S, K, T, sigma, r, Put)

	// For ATM options with r>0, put should be slightly less than call due to discounting
	callPrice := BlackScholesPrice(S, K, T, sigma, r, Call)

	// Put-call parity: C - P = S - K*exp(-rT)
	// For ATM: C - P ≈ S - S*exp(-rT) ≈ S*r*T (small positive)
	expectedDiff := S * (1 - math.Exp(-r*T))
	actualDiff := callPrice - price

	tolerance := 1.0
	if math.Abs(actualDiff-expectedDiff) > tolerance {
		t.Errorf("Put-call parity violation: C-P=%.2f, expected %.2f (diff: %.2f)", actualDiff, expectedDiff, actualDiff-expectedDiff)
	}

	t.Logf("Put price: %.2f, Call price: %.2f", price, callPrice)
}

// TestBlackScholesAtExpiry tests pricing at expiration
func TestBlackScholesAtExpiry(t *testing.T) {
	S := 3500.0
	K := 3400.0
	T := 0.0 // At expiry
	sigma := 0.5
	r := 0.05

	// ITM call should equal intrinsic value
	callPrice := BlackScholesPrice(S, K, T, sigma, r, Call)
	expectedCall := S - K // 100

	if math.Abs(callPrice-expectedCall) > 0.01 {
		t.Errorf("ITM Call at expiry: got %.2f, expected %.2f", callPrice, expectedCall)
	}

	// OTM put should be 0
	putPrice := BlackScholesPrice(S, K, T, sigma, r, Put)
	if putPrice > 0.01 {
		t.Errorf("OTM Put at expiry: got %.2f, expected 0", putPrice)
	}

	t.Logf("ITM Call at expiry: %.2f, OTM Put at expiry: %.2f", callPrice, putPrice)
}

// TestDeltaCalculation tests delta values
func TestDeltaCalculation(t *testing.T) {
	S := 3500.0
	K := 3500.0
	T := 0.1
	sigma := 0.5
	r := 0.05

	callDelta := CalculateDelta(S, K, T, sigma, r, Call)
	putDelta := CalculateDelta(S, K, T, sigma, r, Put)

	// ATM call delta should be around 0.5-0.6
	if callDelta < 0.4 || callDelta > 0.7 {
		t.Errorf("ATM Call delta %.4f outside expected range [0.4, 0.7]", callDelta)
	}

	// ATM put delta should be around -0.4 to -0.5
	if putDelta > -0.3 || putDelta < -0.6 {
		t.Errorf("ATM Put delta %.4f outside expected range [-0.6, -0.3]", putDelta)
	}

	t.Logf("ATM Call Delta: %.4f, ATM Put Delta: %.4f", callDelta, putDelta)
}

// TestPnLCalculation tests P&L for a simple long call position
func TestPnLCalculation(t *testing.T) {
	leg := OptionLeg{
		Type:     Call,
		Side:     Long,
		Strike:   3500,
		Premium:  100,
		Quantity: 1,
	}

	S := 3500.0
	sigma := 0.5
	r := 0.05

	// At expiry, if price goes to 3700
	expiryPrice := 3700.0
	pnl := CalculateLegPnL(leg, S, expiryPrice, 0.0, sigma, r)

	// Intrinsic value at expiry: 3700 - 3500 = 200
	// P&L = 200 - 100 (premium paid) = 100
	expectedPnL := 100.0

	if math.Abs(pnl-expectedPnL) > 1.0 {
		t.Errorf("Long Call P&L: got %.2f, expected %.2f", pnl, expectedPnL)
	}

	t.Logf("Long Call P&L (S=3700, K=3500): %.2f", pnl)
}

// TestMatrixGeneration tests parallel matrix generation
func TestMatrixGeneration(t *testing.T) {
	req := MatrixRequest{
		UnderlyingPrice: 3500.0,
		Volatility:      0.5,
		RiskFreeRate:    0.05,
		DaysToExpiry:    30,
		Legs: []OptionLeg{
			{Type: Call, Side: Long, Strike: 3500, Premium: 100, Quantity: 1},
		},
	}

	response := GeneratePnLMatrix(req, 50, 30)

	// Verify matrix dimensions
	if len(response.PriceAxis) != 50 {
		t.Errorf("Price axis length: got %d, expected 50", len(response.PriceAxis))
	}
	if len(response.TimeAxis) != 30 {
		t.Errorf("Time axis length: got %d, expected 30", len(response.TimeAxis))
	}
	if len(response.PnLMatrix) != 30 {
		t.Errorf("Matrix rows: got %d, expected 30", len(response.PnLMatrix))
	}
	if len(response.PnLMatrix[0]) != 50 {
		t.Errorf("Matrix cols: got %d, expected 50", len(response.PnLMatrix[0]))
	}

	// Verify max/min are reasonable
	if response.MaxProfit <= response.MaxLoss {
		t.Errorf("MaxProfit (%.2f) should be > MaxLoss (%.2f)", response.MaxProfit, response.MaxLoss)
	}

	t.Logf("Matrix generated: %dx%d, MaxProfit: %.2f, MaxLoss: %.2f",
		len(response.PriceAxis), len(response.TimeAxis), response.MaxProfit, response.MaxLoss)
}
