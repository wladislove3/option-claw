import React from 'react';
import { useBuilderStore } from '../store/builderStore';

export const StrikeRoller: React.FC = () => {
  const { spotPrice, targetSpotPrice, setTargetSpot } = useBuilderStore();

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTargetSpot(Number(e.target.value));
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-[#131722] border border-[#2a2e39] rounded-xl relative">
      <div className="flex justify-between items-center text-sm text-gray-400 font-mono">
        <span>Min Spot</span>
        <span className="text-white bg-blue-500/20 px-2 py-1 rounded">Target: ${targetSpotPrice.toLocaleString()}</span>
        <span>Max Spot</span>
      </div>
      <div className="relative w-full h-8">
        <input
          type="range"
          min={spotPrice * 0.5}
          max={spotPrice * 1.5}
          step="100"
          value={targetSpotPrice}
          onChange={handleSlider}
          className="w-full h-2 bg-[#2a2e39] rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all absolute top-1/2 -translate-y-1/2"
        />
        {/* Spot Indicator */}
        <div 
          className="absolute w-0.5 h-6 bg-green-500 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${((spotPrice - spotPrice * 0.5) / (spotPrice * 1.5 - spotPrice * 0.5)) * 100}%` }}
        >
          <div className="absolute -top-6 -translate-x-1/2 text-[10px] text-green-500 whitespace-nowrap">Current</div>
        </div>
      </div>
    </div>
  );
};
