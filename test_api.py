#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://localhost:8080/api/calculate"

def test_strategy(name, legs):
    payload = {
        "underlying_price": 3500,
        "volatility": 0.65,
        "risk_free_rate": 0.05,
        "days_to_expiry": 30,
        "legs": legs
    }
    resp = requests.post(BASE_URL, json=payload)
    data = resp.json()
    
    mid = len(data['price_axis']) // 2
    pnl_30d = data['pnl_matrix'][0][mid]  # Top row = 30 days
    pnl_0d = data['pnl_matrix'][-1][mid]  # Bottom row = 0 days (expiry)
    
    print(f"\n{'='*50}")
    print(f"  {name}")
    print(f"{'='*50}")
    print(f"  Max Profit: +${data['max_profit']:.2f}")
    print(f"  Max Loss:   -${abs(data['max_loss']):.2f}")
    print(f"  P&L at 30 DTE (ATM): ${pnl_30d:.2f}")
    print(f"  P&L at 0 DTE (ATM):  ${pnl_0d:.2f}")
    print(f"  Theta decay impact:  ${pnl_30d - pnl_0d:.2f}")
    return data

print("\n" + "="*60)
print("  ETH OPTIONS P&L VERIFICATION - ALL 4 COMBINATIONS")
print("="*60)

# 1. LONG CALL
test_strategy(
    "LONG CALL (Bullish)",
    [{"type": "CALL", "side": "LONG", "strike": 3500, "premium": 266.53, "quantity": 1}]
)

# 2. SHORT CALL
test_strategy(
    "SHORT CALL (Bearish)",
    [{"type": "CALL", "side": "SHORT", "strike": 3500, "premium": 266.53, "quantity": 1}]
)

# 3. LONG PUT
test_strategy(
    "LONG PUT (Bearish)",
    [{"type": "PUT", "side": "LONG", "strike": 3500, "premium": 252.18, "quantity": 1}]
)

# 4. SHORT PUT
test_strategy(
    "SHORT PUT (Bullish)",
    [{"type": "PUT", "side": "SHORT", "strike": 3500, "premium": 252.18, "quantity": 1}]
)

# 5. IRON CONDOR (4 legs)
print(f"\n{'='*50}")
print(f"  IRON CONDOR (Neutral Strategy)")
print(f"{'='*50}")
data = test_strategy(
    "IRON CONDOR",
    [
        {"type": "CALL", "side": "SHORT", "strike": 3800, "premium": 150, "quantity": 1},
        {"type": "CALL", "side": "LONG", "strike": 4000, "premium": 50, "quantity": 1},
        {"type": "PUT", "side": "SHORT", "strike": 3200, "premium": 120, "quantity": 1},
        {"type": "PUT", "side": "LONG", "strike": 3000, "premium": 40, "quantity": 1}
    ]
)

print("\n" + "="*60)
print("  ALL TESTS COMPLETED")
print("="*60 + "\n")
