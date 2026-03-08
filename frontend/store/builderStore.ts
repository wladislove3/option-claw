import { create } from 'zustand';
import { OptionLeg, MatrixRequest, MatrixResponse } from '@/types/options';

interface BuilderState {
  underlyingPrice: number;
  volatility: number;
  riskFreeRate: number;
  daysToExpiry: number;
  legs: OptionLeg[];
  matrixData: MatrixResponse | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUnderlyingPrice: (price: number) => void;
  setVolatility: (vol: number) => void;
  setRiskFreeRate: (rate: number) => void;
  setDaysToExpiry: (days: number) => void;
  addLeg: (leg: OptionLeg) => void;
  removeLeg: (index: number) => void;
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

  setUnderlyingPrice: (price) => set({ underlyingPrice: price }),
  setVolatility: (vol) => set({ volatility: vol }),
  setRiskFreeRate: (rate) => set({ riskFreeRate: rate }),
  setDaysToExpiry: (days) => set({ daysToExpiry: days }),
  
  addLeg: (leg) => set((state) => ({ legs: [...state.legs, leg] })),
  removeLeg: (index) => set((state) => ({ legs: state.legs.filter((_, i) => i !== index) })),

  calculate: async () => {
    const { underlyingPrice, volatility, riskFreeRate, daysToExpiry, legs } = get();
    
    if (legs.length === 0) {
      set({ matrixData: null, error: 'Add at least one leg to calculate' });
      return;
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

      const response = await fetch('http://localhost:8080/api/calculate', {
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
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
}));
