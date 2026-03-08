import React from 'react';
import { useBuilderStore } from '../store/builderStore';

export const ExpiryRoller: React.FC = () => {
  const { targetDaysToExpiry, setTargetDays } = useBuilderStore();

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTargetDays(Number(e.target.value));
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-[#131722] border border-[#2a2e39] rounded-xl relative">
      <div className="flex justify-between items-center text-sm text-gray-400 font-mono">
        <span>0DTE</span>
        <span className="text-white bg-purple-500/20 px-2 py-1 rounded">Target DTE: {targetDaysToExpiry}d</span>
        <span>180DTE</span>
      </div>
      <div className="relative w-full h-8">
        <input
          type="range"
          min={0}
          max={180}
          step="1"
          value={targetDaysToExpiry}
          onChange={handleSlider}
          className="w-full h-2 bg-[#2a2e39] rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all absolute top-1/2 -translate-y-1/2"
        />
      </div>
    </div>
  );
};
