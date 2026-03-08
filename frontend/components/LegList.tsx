'use client';

import React from 'react';
import { OptionLeg } from '@/types/options';

interface LegListProps {
  legs: OptionLeg[];
  onRemove: (index: number) => void;
}

export default function LegList({ legs, onRemove }: LegListProps) {
  if (legs.length === 0) {
    return (
      <div className="bg-zinc-800 p-4 rounded-lg mb-4 text-center text-zinc-400">
        No legs added yet. Add option legs above to build your strategy.
      </div>
    );
  }

  return (
    <div className="bg-zinc-800 p-4 rounded-lg mb-4">
      <h3 className="text-lg font-semibold mb-3 text-zinc-100">
        Strategy Legs ({legs.length})
      </h3>
      
      <div className="space-y-2">
        {legs.map((leg, index) => (
          <div
            key={index}
            className="flex items-center justify-between bg-zinc-700 p-3 rounded"
          >
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-1 rounded text-xs font-bold ${
                  leg.side === 'LONG'
                    ? 'bg-green-600 text-white'
                    : 'bg-red-600 text-white'
                }`}
              >
                {leg.side}
              </span>
              <span
                className={`px-2 py-1 rounded text-xs font-bold ${
                  leg.type === 'CALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-purple-600 text-white'
                }`}
              >
                {leg.type}
              </span>
              <span className="text-zinc-100 font-mono">
                K={leg.strike} @ ${leg.premium} × {leg.quantity}
              </span>
            </div>
            
            <button
              onClick={() => onRemove(index)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
