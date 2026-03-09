export type OptionType = 'CALL' | 'PUT';
export type Side = 'LONG' | 'SHORT';

export interface OptionLeg {
  type: OptionType;
  side: Side;
  strike: number;
  premium: number;
  quantity: number;
}

export interface MatrixRequest {
  underlying_price: number;
  volatility: number;
  risk_free_rate: number;
  days_to_expiry?: number;
  legs: OptionLeg[];
}

export interface MatrixResponse {
  price_axis: number[];
  time_axis: number[];
  pnl_matrix: number[][];
  max_profit: number;
  max_loss: number;
  breakevens?: number[];
  underlying_price: number;
}

export interface StrategyState {
  underlyingPrice: number;
  volatility: number;
  riskFreeRate: number;
  daysToExpiry: number;
  legs: OptionLeg[];
}

export const DEFAULT_STRATEGY: StrategyState = {
  underlyingPrice: 3500,
  volatility: 0.65,
  riskFreeRate: 0.05,
  daysToExpiry: 30,
  legs: [],
};
