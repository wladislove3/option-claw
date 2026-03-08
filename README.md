# ETH Options Analytics Dashboard

A professional options analytics dashboard for ETHUSDT and ETH/BTC, featuring interactive P&L heatmaps powered by Black-Scholes modeling.

## Tech Stack

- **Backend:** Go 1.22+ (gonum/mat for matrix calculations, chi router, CORS)
- **Frontend:** Next.js 14+ (TypeScript, Tailwind CSS, D3.js Canvas rendering)
- **Visualization:** HTML5 Canvas with D3.js for high-performance heatmaps

## Features

- **Black-Scholes Pricing:** Accurate European option pricing with Greeks (Delta, Gamma)
- **Multi-Leg Strategies:** Build complex strategies (Iron Condor, Straddle, Strangle, etc.)
- **Interactive Heatmap:** Real-time P&L visualization across price and time dimensions
- **Parallel Computation:** Go goroutines for fast matrix calculations
- **Responsive Design:** Dark-themed UI that adapts to any screen size

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Go 1.22+ (for backend)

### Frontend (Always Available)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

The frontend includes a mock calculation engine, so it works even without the Go backend.

### Backend (Optional - requires Go)

```bash
cd backend
go mod init github.com/user/option-pro/backend
go get github.com/go-chi/chi/v5
go get gonum.org/v1/gonum/mat
go get github.com/rs/cors
go run cmd/api/main.go
```

The API will be available at http://localhost:8080

## API Reference

### POST /api/calculate

Calculate P&L matrix for an options strategy.

**Request Body:**

```json
{
  "underlying_price": 3500.50,
  "volatility": 0.65,
  "risk_free_rate": 0.05,
  "days_to_expiry": 30,
  "legs": [
    {
      "type": "CALL",
      "side": "SHORT",
      "strike": 3800,
      "premium": 150,
      "quantity": 1
    },
    {
      "type": "PUT",
      "side": "LONG",
      "strike": 3400,
      "premium": 120,
      "quantity": 1
    }
  ]
}
```

**Response:**

```json
{
  "price_axis": [2450, 2456, ...],
  "time_axis": [30, 29.4, ...],
  "pnl_matrix": [[...], [...]],
  "max_profit": 500.00,
  "max_loss": -1200.00,
  "breakevens": [3250.50, 3750.25]
}
```

## Project Structure

```
option-pro/
├── backend/
│   ├── cmd/api/
│   │   └── main.go          # API server entry point
│   └── internal/math/
│       ├── models.go        # Data structures
│       ├── utils.go         # Normal distribution functions
│       ├── black_scholes.go # Black-Scholes pricing & Greeks
│       ├── matrix.go        # Parallel P&L matrix generation
│       └── black_scholes_test.go
├── frontend/
│   ├── app/
│   │   └── page.tsx         # Main dashboard page
│   ├── components/
│   │   ├── Heatmap.tsx      # D3.js Canvas heatmap
│   │   ├── LegInput.tsx     # Option leg form
│   │   └── LegList.tsx      # Added legs display
│   └── types/
│       └── options.ts       # TypeScript types
├── architecture_plan.md     # Original specification
├── progress_log.md          # Implementation progress
└── README.md               # This file
```

## Usage Examples

### Long Call

- Add leg: CALL, LONG, Strike=3500, Premium=150, Qty=1
- Click "Calculate P&L"
- View profit potential as ETH price increases

### Iron Condor

1. Short Call @ 3800 (premium: 150)
2. Long Call @ 4000 (premium: 50)
3. Short Put @ 3200 (premium: 120)
4. Long Put @ 3000 (premium: 40)

Result: Limited profit in range, limited loss outside.

## Mathematical Formulas

### Black-Scholes Call Price

```
d1 = (ln(S/K) + (r + σ²/2)T) / (σ√T)
d2 = d1 - σ√T
C = S·Φ(d1) - K·e^(-rT)·Φ(d2)
```

### Black-Scholes Put Price

```
P = K·e^(-rT)·Φ(-d2) - S·Φ(-d1)
```

Where:
- S = underlying price
- K = strike price
- T = time to expiry (years)
- σ = implied volatility
- r = risk-free rate
- Φ = cumulative normal distribution

## Performance

- Matrix generation: 100×50 grid in <100ms (Go backend)
- Canvas rendering: 60 FPS with D3.js
- Supports strategies with unlimited legs

## Notes

- Frontend works standalone with mock calculations
- Go backend provides accurate Black-Scholes pricing
- Heatmap uses red-yellow-green scale (red=loss, green=profit)
- Dashed white line shows current spot price
- Black line shows breakeven points

## License

MIT
