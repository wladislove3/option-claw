import { create } from 'zustand';
import { OptionLeg } from '../types';

interface BuilderStore {
  spotPrice: number; // Current real spot
  targetSpotPrice: number; // User selected spot
  targetDaysToExpiry: number; // User selected DTE
  legs: OptionLeg[];
  setSpotPrice: (spot: number) => void;
  setTargetSpot: (spot: number) => void;
  setTargetDays: (days: number) => void;
  addLeg: (leg: OptionLeg) => void;
  removeLeg: (id: string) => void;
  updateLeg: (id: string, updates: Partial<OptionLeg>) => void;
}

export const useBuilderStore = create<BuilderStore>((set) => ({
  spotPrice: 65000,
  targetSpotPrice: 65000,
  targetDaysToExpiry: 30,
  legs: [
    {
      id: '1',
      symbol: 'BTC-28JUN24-65000-C',
      type: 'Call',
      side: 'Long',
      strike: 65000,
      expiry: 30, // Using days to expiry for simplicity in builder
      size: 1,
      iv: 0.5,
      entryPrice: 2000,
    }
  ],
  setSpotPrice: (spot) => set({ spotPrice: spot }),
  setTargetSpot: (spot) => set({ targetSpotPrice: spot }),
  setTargetDays: (days) => set({ targetDaysToExpiry: days }),
  addLeg: (leg) => set((state) => ({ legs: [...state.legs, leg] })),
  removeLeg: (id) => set((state) => ({ legs: state.legs.filter((l) => l.id !== id) })),
  updateLeg: (id, updates) => set((state) => ({
    legs: state.legs.map((l) => l.id === id ? { ...l, ...updates } : l)
  })),
}));
