package math

import "math"

// BlackScholesPrice calculates the theoretical price of a European option
// S: underlying price, K: strike, T: time to expiry in years, sigma: volatility, r: risk-free rate
func BlackScholesPrice(S, K, T, sigma, r float64, optionType OptionType) float64 {
	if T <= 0 || sigma <= 0 {
		// At expiration or invalid volatility
		if optionType == Call {
			return math.Max(0, S-K)
		}
		return math.Max(0, K-S)
	}

	sqrtT := math.Sqrt(T)
	d1 := (math.Log(S/K) + (r + 0.5*sigma*sigma)*T) / (sigma * sqrtT)
	d2 := d1 - sigma*sqrtT

	if optionType == Call {
		return S*NormCDF(d1) - K*math.Exp(-r*T)*NormCDF(d2)
	}
	return K*math.Exp(-r*T)*NormCDF(-d2) - S*NormCDF(-d1)
}

// CalculateDelta calculates the delta of an option
func CalculateDelta(S, K, T, sigma, r float64, optionType OptionType) float64 {
	if T <= 0 || sigma <= 0 {
		if optionType == Call {
			if S > K {
				return 1.0
			}
			return 0.0
		}
		if S < K {
			return -1.0
		}
		return 0.0
	}

	sqrtT := math.Sqrt(T)
	d1 := (math.Log(S/K) + (r + 0.5*sigma*sigma)*T) / (sigma * sqrtT)

	if optionType == Call {
		return NormCDF(d1)
	}
	return NormCDF(d1) - 1.0
}

// CalculateGamma calculates the gamma of an option
func CalculateGamma(S, K, T, sigma, r float64) float64 {
	if T <= 0 || sigma <= 0 {
		return 0.0
	}

	sqrtT := math.Sqrt(T)
	d1 := (math.Log(S/K) + (r + 0.5*sigma*sigma)*T) / (sigma * sqrtT)

	return NormPDF(d1) / (S * sigma * sqrtT)
}

// CalculateLegPnL calculates P&L for a single option leg at a given underlying price and time
func CalculateLegPnL(leg OptionLeg, currentPrice, expiryPrice, timeToExpiry, sigma, r float64) float64 {
	// Calculate option value at expiry point
	optionValue := BlackScholesPrice(expiryPrice, leg.Strike, timeToExpiry, sigma, r, leg.Type)

	// Calculate initial cost/revenue (premium)
	premiumTotal := leg.Premium * float64(leg.Quantity)

	// Calculate P&L based on side
	var pnl float64
	if leg.Side == Long {
		// Long: paid premium, now have option value
		pnl = (optionValue*float64(leg.Quantity) - premiumTotal)
	} else {
		// Short: received premium, now owe option value
		pnl = (premiumTotal - optionValue*float64(leg.Quantity))
	}

	return pnl
}

// CalculateTotalPnL calculates total P&L for all legs at a given price and time point
func CalculateTotalPnL(legs []OptionLeg, currentPrice, targetPrice, timeToExpiry, sigma, r float64) float64 {
	totalPnL := 0.0
	for _, leg := range legs {
		totalPnL += CalculateLegPnL(leg, currentPrice, targetPrice, timeToExpiry, sigma, r)
	}
	return totalPnL
}
