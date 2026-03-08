import { create } from 'zustand';
import { OptionPosition, Greeks } from '../types';
import { calculateGreeks } from '../math/blackScholes';

interface PortfolioStore {
  positions: OptionPosition[];
  spotPrice: number;
  netGreeks: Greeks;
  totalUnrealizedPnl: number;
  marginHealth: number;
  setSpotPrice: (spot: number) => void;
  updatePositions: (positions: OptionPosition[]) => void;
  recalculateNetGreeks: () => void;
}

const calculateNetGreeks = (positions: OptionPosition[], spotPrice: number): Greeks => {
  return positions.reduce(
    (acc, pos) => {
      // Calculate current greeks for the position
      const greeks = calculateGreeks(
        pos.type,
        spotPrice,
        pos.strike,
        pos.expiry / 365, // assuming expiry is DTE
        0.05, // risk free rate
        pos.iv
      );
      
      const multiplier = pos.side === 'Long' ? pos.size : -pos.size;

      return {
        delta: acc.delta + greeks.delta * multiplier,
        gamma: acc.gamma + greeks.gamma * multiplier,
        theta: acc.theta + greeks.theta * multiplier,
        vega: acc.vega + greeks.vega * multiplier,
        rho: acc.rho + greeks.rho * multiplier,
      };
    },
    { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
  );
};

export const usePortfolioStore = create<PortfolioStore>((set, get) => ({
  positions: [
    {
      id: 'p1',
      symbol: 'BTC-28JUN24-70000-C',
      type: 'Call',
      side: 'Short',
      strike: 70000,
      expiry: 14,
      size: 2,
      iv: 0.65,
      entryPrice: 1500,
      markPrice: 1650,
      unrealizedPnl: -300,
      greeks: { delta: -0.3, gamma: -0.01, theta: 50, vega: -10, rho: -2 }
    },
    {
      id: 'p2',
      symbol: 'BTC-28JUN24-60000-P',
      type: 'Put',
      side: 'Short',
      strike: 60000,
      expiry: 14,
      size: 2,
      iv: 0.70,
      entryPrice: 1200,
      markPrice: 1000,
      unrealizedPnl: 400,
      greeks: { delta: 0.2, gamma: -0.01, theta: 45, vega: -8, rho: 1 }
    }
  ],
  spotPrice: 65000,
  netGreeks: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 },
  totalUnrealizedPnl: 100,
  marginHealth: 0.85,
  setSpotPrice: (spot) => {
    set({ spotPrice: spot });
    get().recalculateNetGreeks();
  },
  updatePositions: (positions) => {
    set({ positions });
    get().recalculateNetGreeks();
  },
  recalculateNetGreeks: () => {
    const { positions, spotPrice } = get();
    const netGreeks = calculateNetGreeks(positions, spotPrice);
    set({ netGreeks });
  }
}));
