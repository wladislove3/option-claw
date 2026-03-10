import { create } from 'zustand';
import { OptionLeg, MatrixRequest, MatrixResponse } from '@/types/options';
import { getBackendHttpUrl } from '@/src/lib/backend-url';

const isFinitePositive = (value: number) => Number.isFinite(value) && value > 0;

function validateLeg(leg: OptionLeg): string | null {
  if (!isFinitePositive(leg.strike)) {
    return 'Strike must be a positive number';
  }
  if (!Number.isFinite(leg.premium) || leg.premium < 0) {
    return 'Premium must be zero or greater';
  }
  if (!Number.isInteger(leg.quantity) || leg.quantity <= 0) {
    return 'Quantity must be a positive integer';
  }
  return null;
}

interface BuilderState {
  underlyingPrice: number;
  volatility: number;
  riskFreeRate: number;
  daysToExpiry: number;
  legs: OptionLeg[];
  matrixData: MatrixResponse | null;
  isLoading: boolean;
  error: string | null;
  bybitApiKey: string;
  bybitApiSecret: string;

  // Actions
  setUnderlyingPrice: (price: number) => void;
  setVolatility: (vol: number) => void;
  setRiskFreeRate: (rate: number) => void;
  setDaysToExpiry: (days: number) => void;
  setBybitCredentials: (apiKey: string, apiSecret: string) => void;
  addLeg: (leg: OptionLeg) => void;
  removeLeg: (index: number) => void;
  validateLeg: (leg: OptionLeg) => string | null;
  calculate: () => Promise<void>;
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  underlyingPrice: 3500,
  volatility: 0.65,
  riskFreeRate: 0.05,
  daysToExpiry: 30,
  legs: [],
  matrixData: null,
  isLoading: false,
  error: null,
  bybitApiKey: '',
  bybitApiSecret: '',

  setUnderlyingPrice: (price) => set({ underlyingPrice: price }),
  setVolatility: (vol) => set({ volatility: vol }),
  setRiskFreeRate: (rate) => set({ riskFreeRate: rate }),
  setDaysToExpiry: (days) => set({ daysToExpiry: days }),
  setBybitCredentials: (apiKey, apiSecret) => set({ bybitApiKey: apiKey, bybitApiSecret: apiSecret }),
  
  addLeg: (leg) =>
    set((state) => {
      const error = validateLeg(leg);
      if (error) {
        return { error };
      }

      return { legs: [...state.legs, leg], error: null };
    }),
  removeLeg: (index) => set((state) => ({ legs: state.legs.filter((_, i) => i !== index) })),
  validateLeg,

  calculate: async () => {
    const { underlyingPrice, volatility, riskFreeRate, daysToExpiry, legs } = get();
    
    if (legs.length === 0) {
      set({ matrixData: null, error: 'Add at least one leg to calculate' });
      return;
    }

    if (!isFinitePositive(underlyingPrice)) {
      set({ matrixData: null, error: 'Underlying price must be positive' });
      return;
    }
    if (!isFinitePositive(volatility)) {
      set({ matrixData: null, error: 'Volatility must be positive' });
      return;
    }
    if (!Number.isFinite(riskFreeRate) || riskFreeRate < 0) {
      set({ matrixData: null, error: 'Risk-free rate cannot be negative' });
      return;
    }
    if (!Number.isInteger(daysToExpiry) || daysToExpiry <= 0) {
      set({ matrixData: null, error: 'Days to expiry must be a positive integer' });
      return;
    }

    for (const leg of legs) {
      const error = validateLeg(leg);
      if (error) {
        set({ matrixData: null, error });
        return;
      }
    }

    set({ isLoading: true, error: null });

    try {
      const request: MatrixRequest = {
        underlying_price: underlyingPrice,
        volatility: volatility,
        risk_free_rate: riskFreeRate,
        days_to_expiry: daysToExpiry,
        legs: legs,
      };

      const response = await fetch(getBackendHttpUrl('/api/calculate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to calculate');
      }

      const data = await response.json();
      set({ matrixData: data, isLoading: false });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : 'Failed to calculate',
        isLoading: false,
      });
    }
  },
}));
