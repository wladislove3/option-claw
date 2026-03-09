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

// TestAllLegCombinations tests all 4 combinations: CALL/PUT × LONG/SHORT
func TestAllLegCombinations(t *testing.T) {
	S := 3500.0      // Current underlying price
	K := 3500.0      // ATM strike
	T := 30.0 / 365.0 // 30 days to expiry
	sigma := 0.65    // 65% IV
	r := 0.05        // 5% risk-free rate

	// Calculate option premiums at inception (T=30 days)
	callPremium := BlackScholesPrice(S, K, T, sigma, r, Call)
	putPremium := BlackScholesPrice(S, K, T, sigma, r, Put)

	t.Logf("ATM Call Premium: $%.2f, ATM Put Premium: $%.2f", callPremium, putPremium)

	testCases := []struct {
		name              string
		leg               OptionLeg
		premium           float64
		testPrice         float64 // Price at expiry for testing
		expectedPnLSign   int     // Expected P&L sign: +1 positive, -1 negative, 0 any
		description       string
	}{
		{
			name: "Long Call - OTM at expiry (max loss = premium)",
			leg:  OptionLeg{Type: Call, Side: Long, Strike: 3500, Premium: callPremium, Quantity: 1},
			premium: callPremium,
			testPrice: 3300.0, // OTM, expires worthless
			expectedPnLSign: -1, // Should lose premium paid
			description: "Long Call: Buy call, price goes down → lose premium",
		},
		{
			name: "Long Call - ITM at expiry (profit)",
			leg:  OptionLeg{Type: Call, Side: Long, Strike: 3500, Premium: callPremium, Quantity: 1},
			premium: callPremium,
			testPrice: 3800.0, // ITM by $300
			expectedPnLSign: +1, // Should profit
			description: "Long Call: Buy call, price goes up → profit",
		},
		{
			name: "Short Call - OTM at expiry (max profit = premium)",
			leg:  OptionLeg{Type: Call, Side: Short, Strike: 3500, Premium: callPremium, Quantity: 1},
			premium: callPremium,
			testPrice: 3300.0, // OTM, expires worthless
			expectedPnLSign: +1, // Keep premium
			description: "Short Call: Sell call, price stays down → keep premium",
		},
		{
			name: "Short Call - ITM at expiry (loss)",
			leg:  OptionLeg{Type: Call, Side: Short, Strike: 3500, Premium: callPremium, Quantity: 1},
			premium: callPremium,
			testPrice: 3800.0, // ITM by $300
			expectedPnLSign: -1, // Should lose
			description: "Short Call: Sell call, price goes up → loss",
		},
		{
			name: "Long Put - OTM at expiry (max loss = premium)",
			leg:  OptionLeg{Type: Put, Side: Long, Strike: 3500, Premium: putPremium, Quantity: 1},
			premium: putPremium,
			testPrice: 3700.0, // OTM, expires worthless
			expectedPnLSign: -1, // Lose premium
			description: "Long Put: Buy put, price goes up → lose premium",
		},
		{
			name: "Long Put - ITM at expiry (profit)",
			leg:  OptionLeg{Type: Put, Side: Long, Strike: 3500, Premium: putPremium, Quantity: 1},
			premium: putPremium,
			testPrice: 3200.0, // ITM by $300
			expectedPnLSign: +1, // Should profit
			description: "Long Put: Buy put, price goes down → profit",
		},
		{
			name: "Short Put - OTM at expiry (max profit = premium)",
			leg:  OptionLeg{Type: Put, Side: Short, Strike: 3500, Premium: putPremium, Quantity: 1},
			premium: putPremium,
			testPrice: 3700.0, // OTM, expires worthless
			expectedPnLSign: +1, // Keep premium
			description: "Short Put: Sell put, price stays up → keep premium",
		},
		{
			name: "Short Put - ITM at expiry (loss)",
			leg:  OptionLeg{Type: Put, Side: Short, Strike: 3500, Premium: putPremium, Quantity: 1},
			premium: putPremium,
			testPrice: 3200.0, // ITM by $300
			expectedPnLSign: -1, // Should lose
			description: "Short Put: Sell put, price goes down → loss",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Calculate P&L at expiry (T=0)
			pnl := CalculateLegPnL(tc.leg, S, tc.testPrice, 0.0, sigma, r)

			t.Logf("%s", tc.description)
			t.Logf("  P&L at expiry (S=%.0f): $%.2f", tc.testPrice, pnl)

			// Check P&L sign
			if tc.expectedPnLSign != 0 {
				if tc.expectedPnLSign > 0 && pnl <= 0 {
					t.Errorf("Expected positive P&L, got %.2f", pnl)
				}
				if tc.expectedPnLSign < 0 && pnl >= 0 {
					t.Errorf("Expected negative P&L, got %.2f", pnl)
				}
			}

			// Verify max loss for long positions is limited to premium
			if tc.leg.Side == Long {
				maxLoss := -tc.leg.Premium * float64(tc.leg.Quantity)
				if pnl < maxLoss-0.01 {
					t.Errorf("Long position P&L (%.2f) below max loss (%.2f)", pnl, maxLoss)
				}
			}
		})
	}
}

// TestThetaDecay tests that time decay works correctly for long positions
func TestThetaDecay(t *testing.T) {
	S := 3500.0
	K := 3500.0
	sigma := 0.65
	r := 0.05

	// Get premium at 30 DTE
	T30 := 30.0 / 365.0
	callPremium30 := BlackScholesPrice(S, K, T30, sigma, r, Call)
	putPremium30 := BlackScholesPrice(S, K, T30, sigma, r, Put)

	longCall := OptionLeg{Type: Call, Side: Long, Strike: K, Premium: callPremium30, Quantity: 1}
	longPut := OptionLeg{Type: Put, Side: Long, Strike: K, Premium: putPremium30, Quantity: 1}

	// Test at same underlying price (ATM), but different time points
	// Theta decay should reduce option value over time for long positions

	// Long Call: at 30 DTE vs at 0 DTE (expiry)
	pnl30Call := CalculateLegPnL(longCall, S, S, T30, sigma, r) // P&L if we mark to market at 30 DTE
	pnlExpiryCall := CalculateLegPnL(longCall, S, S, 0.0, sigma, r) // P&L at expiry with same price

	t.Logf("Long Call Theta Test:")
	t.Logf("  P&L at 30 DTE (mark to market): $%.2f", pnl30Call)
	t.Logf("  P&L at expiry (S=K): $%.2f", pnlExpiryCall)

	// At expiry with S=K, call expires worthless, so P&L = -premium
	expectedPnlExpiryCall := -callPremium30
	if math.Abs(pnlExpiryCall-expectedPnlExpiryCall) > 0.01 {
		t.Errorf("Long Call at expiry: got %.2f, expected %.2f", pnlExpiryCall, expectedPnlExpiryCall)
	}

	// Long Put: same logic
	pnl30Put := CalculateLegPnL(longPut, S, S, T30, sigma, r)
	pnlExpiryPut := CalculateLegPnL(longPut, S, S, 0.0, sigma, r)

	t.Logf("Long Put Theta Test:")
	t.Logf("  P&L at 30 DTE (mark to market): $%.2f", pnl30Put)
	t.Logf("  P&L at expiry (S=K): $%.2f", pnlExpiryPut)

	// At expiry with S=K, put expires worthless
	expectedPnlExpiryPut := -putPremium30
	if math.Abs(pnlExpiryPut-expectedPnlExpiryPut) > 0.01 {
		t.Errorf("Long Put at expiry: got %.2f, expected %.2f", pnlExpiryPut, expectedPnlExpiryPut)
	}
}

// TestShortPositionTheta tests that theta decay benefits short positions
func TestShortPositionTheta(t *testing.T) {
	S := 3500.0
	K := 3500.0
	sigma := 0.65
	r := 0.05

	T30 := 30.0 / 365.0
	callPremium30 := BlackScholesPrice(S, K, T30, sigma, r, Call)

	shortCall := OptionLeg{Type: Call, Side: Short, Strike: K, Premium: callPremium30, Quantity: 1}

	// Short call: receive premium upfront
	// At expiry with S=K, option expires worthless, keep full premium
	pnlExpiry := CalculateLegPnL(shortCall, S, S, 0.0, sigma, r)

	t.Logf("Short Call Theta Test:")
	t.Logf("  Premium received: $%.2f", callPremium30)
	t.Logf("  P&L at expiry (S=K): $%.2f", pnlExpiry)

	// Should keep full premium
	if math.Abs(pnlExpiry-callPremium30) > 0.01 {
		t.Errorf("Short Call at expiry: got %.2f, expected %.2f (full premium)", pnlExpiry, callPremium30)
	}
}
