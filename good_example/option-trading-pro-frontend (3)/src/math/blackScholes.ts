export const N = (x: number): number => {
  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.39894228;

  if (x >= 0.0) {
    const t = 1.0 / (1.0 + p * x);
    return 1.0 - c * Math.exp(-x * x / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  } else {
    const t = 1.0 / (1.0 - p * x);
    return c * Math.exp(-x * x / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  }
};

export const n = (x: number): number => {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
};

export const d1 = (S: number, K: number, T: number, r: number, sigma: number): number => {
  if (T <= 0) return S > K ? Infinity : -Infinity;
  return (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
};

export const d2 = (S: number, K: number, T: number, r: number, sigma: number, d1Val?: number): number => {
  if (T <= 0) return S > K ? Infinity : -Infinity;
  const d1Actual = d1Val !== undefined ? d1Val : d1(S, K, T, r, sigma);
  return d1Actual - sigma * Math.sqrt(T);
};

export const calculatePrice = (type: 'Call' | 'Put', S: number, K: number, T: number, r: number, sigma: number): number => {
  if (T <= 0) {
    return type === 'Call' ? Math.max(0, S - K) : Math.max(0, K - S);
  }
  const d1Val = d1(S, K, T, r, sigma);
  const d2Val = d2(S, K, T, r, sigma, d1Val);

  if (type === 'Call') {
    return S * N(d1Val) - K * Math.exp(-r * T) * N(d2Val);
  } else {
    return K * Math.exp(-r * T) * N(-d2Val) - S * N(-d1Val);
  }
};

export const calculateGreeks = (type: 'Call' | 'Put', S: number, K: number, T: number, r: number, sigma: number) => {
  const EPSILON = 1e-6; // small time to expiry representation for expiry day
  const effectiveT = T <= 0 ? EPSILON : T;

  const d1Val = d1(S, K, effectiveT, r, sigma);
  const d2Val = d2(S, K, effectiveT, r, sigma, d1Val);

  let delta, gamma, theta, vega, rho;

  gamma = n(d1Val) / (S * sigma * Math.sqrt(effectiveT));
  vega = S * n(d1Val) * Math.sqrt(effectiveT) / 100;

  if (type === 'Call') {
    delta = N(d1Val);
    theta = (-S * n(d1Val) * sigma / (2 * Math.sqrt(effectiveT)) - r * K * Math.exp(-r * effectiveT) * N(d2Val)) / 365;
    rho = K * effectiveT * Math.exp(-r * effectiveT) * N(d2Val) / 100;
  } else {
    delta = N(d1Val) - 1;
    theta = (-S * n(d1Val) * sigma / (2 * Math.sqrt(effectiveT)) + r * K * Math.exp(-r * effectiveT) * N(-d2Val)) / 365;
    rho = -K * effectiveT * Math.exp(-r * effectiveT) * N(-d2Val) / 100;
  }

  // Handle expiry edge cases
  if (T <= 0) {
    gamma = 0;
    vega = 0;
    theta = 0;
    rho = 0;
  }

  return { delta, gamma, theta, vega, rho };
};
