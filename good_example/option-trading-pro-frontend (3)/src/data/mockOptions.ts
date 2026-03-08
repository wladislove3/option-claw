// src/data/mockOptions.ts

export const CURRENT_BTC_PRICE = 65000;

export const generateMockChain = () => {
  const strikes = [];
  for (let i = 60000; i <= 70000; i += 1000) {
    strikes.push(i);
  }

  const calls = strikes.map((strike) => ({
    type: 'call',
    strike,
    bid: Math.max(0, CURRENT_BTC_PRICE - strike) + Math.random() * 500,
    ask: Math.max(0, CURRENT_BTC_PRICE - strike) + Math.random() * 500 + 50,
    iv: 0.45 + (Math.random() - 0.5) * 0.1, // 40-50% IV
    delta: strike > CURRENT_BTC_PRICE ? 0.3 + Math.random() * 0.2 : 0.6 + Math.random() * 0.3,
  }));

  const puts = strikes.map((strike) => ({
    type: 'put',
    strike,
    bid: Math.max(0, strike - CURRENT_BTC_PRICE) + Math.random() * 500,
    ask: Math.max(0, strike - CURRENT_BTC_PRICE) + Math.random() * 500 + 50,
    iv: 0.48 + (Math.random() - 0.5) * 0.1, // 43-53% IV
    delta: strike > CURRENT_BTC_PRICE ? -0.6 - Math.random() * 0.3 : -0.3 - Math.random() * 0.2,
  }));

  return { strikes, calls, puts };
};

export const MOCK_CHAIN = generateMockChain();
