export type OptionType = 'Call' | 'Put';
export type PositionSide = 'Long' | 'Short';

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface OptionLeg {
  id: string;
  symbol: string;
  type: OptionType;
  side: PositionSide;
  strike: number;
  expiry: number; // Expiry timestamp or days
  size: number;
  iv: number;
  entryPrice?: number;
}

export interface OptionPosition extends OptionLeg {
  markPrice: number;
  unrealizedPnl: number;
  greeks: Greeks;
}

export interface PortfolioState {
  positions: OptionPosition[];
  spotPrice: number;
  netGreeks: Greeks;
  totalUnrealizedPnl: number;
  marginHealth: number;
  addPosition: (position: OptionPosition) => void;
  updateSpot: (price: number) => void;
  recalculateTotal: () => void;
}

export interface BuilderState {
  spotPrice: number;
  legs: OptionLeg[];
  targetDaysToExpiry: number;
  targetSpotPrice: number;
  addLeg: (leg: OptionLeg) => void;
  removeLeg: (id: string) => void;
  updateLeg: (id: string, updates: Partial<OptionLeg>) => void;
  updateTargetDays: (days: number) => void;
  updateTargetSpot: (spot: number) => void;
}
