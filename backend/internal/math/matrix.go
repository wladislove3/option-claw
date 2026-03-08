package math

import (
	"math"
	"sync"
)

// GeneratePnLMatrix generates a 2D P&L matrix for heatmap visualization
// Uses goroutines for parallel computation of matrix rows
func GeneratePnLMatrix(req MatrixRequest, priceSteps, timeSteps int) MatrixResponse {
	// Price range: 0.7x to 1.3x of current underlying price
	minPrice := req.UnderlyingPrice * 0.7
	maxPrice := req.UnderlyingPrice * 1.3
	priceStep := (maxPrice - minPrice) / float64(priceSteps-1)

	// Time range: from current days to 0 (expiry)
	maxDays := float64(req.DaysToExpiry)
	if maxDays <= 0 {
		maxDays = 30 // Default to 30 days if not specified
	}
	timeStep := maxDays / float64(timeSteps-1)

	// Build axes
	priceAxis := make([]float64, priceSteps)
	timeAxis := make([]float64, timeSteps)

	for i := 0; i < priceSteps; i++ {
		priceAxis[i] = minPrice + float64(i)*priceStep
	}
	for i := 0; i < timeSteps; i++ {
		timeAxis[i] = maxDays - float64(i)*timeStep
	}

	// Initialize matrix
	pnlMatrix := make([][]float64, timeSteps)
	for i := range pnlMatrix {
		pnlMatrix[i] = make([]float64, priceSteps)
	}

	// Calculate P&L matrix in parallel (one goroutine per row)
	var wg sync.WaitGroup
	maxProfit := math.Inf(-1)
	maxLoss := math.Inf(1)
	var mu sync.Mutex

	for t := 0; t < timeSteps; t++ {
		wg.Add(1)
		go func(timeIdx int) {
			defer wg.Done()
			daysToExpiry := timeAxis[timeIdx]
			yearsToExpiry := daysToExpiry / 365.0

			for p := 0; p < priceSteps; p++ {
				targetPrice := priceAxis[p]
				pnl := CalculateTotalPnL(req.Legs, req.UnderlyingPrice, targetPrice, yearsToExpiry, req.Volatility, req.RiskFreeRate)
				pnlMatrix[timeIdx][p] = pnl

				mu.Lock()
				if pnl > maxProfit {
					maxProfit = pnl
				}
				if pnl < maxLoss {
					maxLoss = pnl
				}
				mu.Unlock()
			}
		}(t)
	}

	wg.Wait()

	// Handle edge case where all values are the same
	if math.IsInf(maxProfit, -1) {
		maxProfit = 0
	}
	if math.IsInf(maxLoss, 1) {
		maxLoss = 0
	}

	return MatrixResponse{
		PriceAxis:  priceAxis,
		TimeAxis:   timeAxis,
		PnLMatrix:  pnlMatrix,
		MaxProfit:  maxProfit,
		MaxLoss:    maxLoss,
		Breakevens: findBreakevens(pnlMatrix, priceAxis, timeAxis),
	}
}

// findBreakevens finds approximate breakeven points at expiry (time = 0)
func findBreakevens(matrix [][]float64, priceAxis, timeAxis []float64) []float64 {
	breakevens := []float64{}

	// Find the row closest to expiry (time = 0)
	expiryRow := len(matrix) - 1

	// Look for sign changes in P&L
	for i := 0; i < len(matrix[expiryRow])-1; i++ {
		pnl1 := matrix[expiryRow][i]
		pnl2 := matrix[expiryRow][i+1]

		// Check for sign change (breakeven)
		if pnl1*pnl2 < 0 {
			// Linear interpolation to find exact breakeven
			ratio := math.Abs(pnl1) / (math.Abs(pnl1) + math.Abs(pnl2))
			breakeven := priceAxis[i] + ratio*(priceAxis[i+1]-priceAxis[i])
			breakevens = append(breakevens, breakeven)
		}
	}

	return breakevens
}
