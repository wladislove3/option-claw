import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { useBuilderStore } from '../store/builderStore';
import { calculatePrice } from '../math/blackScholes';
import { clsx } from 'clsx';

export const Heatmap: React.FC = () => {
  const { legs, spotPrice, targetDaysToExpiry } = useBuilderStore();

  const { matrix, xLabels, yLabels } = useMemo(() => {
    const daysSteps = 10;
    const priceSteps = 10;
    
    // Y-Axis: Price (Spot)
    const minSpot = spotPrice * 0.8;
    const maxSpot = spotPrice * 1.2;
    const priceStep = (maxSpot - minSpot) / priceSteps;
    const prices = Array.from({length: priceSteps + 1}, (_, i) => maxSpot - i * priceStep); // Descending

    // X-Axis: Time Decay (DTE)
    const maxDays = Math.max(...legs.map(l => l.expiry), targetDaysToExpiry);
    const dayStep = maxDays / daysSteps;
    const days = Array.from({length: daysSteps + 1}, (_, i) => maxDays - i * dayStep); // Descending

    const grid = prices.map(price => {
      return days.map(day => {
        let pnl = 0;
        legs.forEach(leg => {
          const r = 0.05;
          // Time to expiry for this leg at this 'day' step
          // if day > leg.expiry, it means we are before expiry. 
          // Wait, 'day' is DTE.
          const currentPrice = calculatePrice(
            leg.type, 
            price, 
            leg.strike, 
            Math.max(0.001, day) / 365, 
            r, 
            leg.iv
          );
          const entry = leg.entryPrice || 0;
          const multiplier = leg.side === 'Long' ? leg.size : -leg.size;
          pnl += (currentPrice - entry) * multiplier;
        });
        return pnl;
      });
    });

    return { matrix: grid, xLabels: days, yLabels: prices };
  }, [legs, spotPrice, targetDaysToExpiry]);

  // Color interpolator
  const maxAbs = Math.max(
    Math.abs(Math.min(...matrix.flat())),
    Math.max(...matrix.flat())
  ) || 1;

  const colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([-maxAbs, maxAbs]);

  return (
    <div className="absolute inset-0 flex flex-col text-[10px] sm:text-xs font-mono">
      <div className="flex flex-row justify-between text-gray-400 mb-1 px-10 shrink-0">
        <span>&larr; Time to Expiry (Days) &rarr;</span>
      </div>
      <div className="flex flex-1 relative min-h-0">
        {/* Y Axis Labels */}
        <div className="flex flex-col justify-between pr-2 text-right w-12 text-gray-400 shrink-0">
          {yLabels.map((p, i) => (
            <div key={i} className="flex-1 flex items-center justify-end">{Math.round(p)}</div>
          ))}
        </div>
        
        {/* Grid */}
        <div className="flex-1 grid gap-0.5" style={{ gridTemplateRows: `repeat(${yLabels.length}, 1fr)` }}>
          {matrix.map((row, i) => (
            <div key={i} className="flex gap-0.5">
              {row.map((cell, j) => {
                const color = colorScale(cell);
                return (
                  <div 
                    key={j} 
                    className="flex-1 flex items-center justify-center rounded-sm transition-colors duration-200 cursor-pointer hover:border hover:border-white"
                    style={{ backgroundColor: color, opacity: 0.85 }}
                    title={`P&L: $${cell.toFixed(2)}`}
                  >
                    <span className={clsx("font-semibold mix-blend-difference text-white opacity-80", Math.abs(cell) < (maxAbs*0.2) ? 'hidden' : '')}>
                      {cell > 0 ? '+' : ''}{Math.round(cell)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* X Axis Labels */}
      <div className="flex justify-between pl-12 pt-1 text-gray-400 shrink-0">
        {xLabels.map((d, i) => (
          <div key={i} className="flex-1 text-center">{Math.round(d)}d</div>
        ))}
      </div>
    </div>
  );
};
