import React from 'react';
import { StrikeRoller } from './StrikeRoller';
import { ExpiryRoller } from './ExpiryRoller';
import { PayoffChart } from './PayoffChart';
import { Heatmap } from './Heatmap';
import { OptionChain } from './OptionChain';
import { Layers, ActivitySquare } from 'lucide-react';
import { useBuilderStore } from '../store/builderStore';

export const StrategyBuilder: React.FC = () => {
  const { legs, removeLeg } = useBuilderStore();

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12">
      {/* TOP ROW: Analytics (Rollers + Charts) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Col 1-3: Scenario Rollers */}
        <div className="xl:col-span-3 bg-[#131722] border border-[#2a2e39] rounded-xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center gap-3 mb-5 border-b border-[#2a2e39] pb-3 shrink-0">
            <ActivitySquare className="w-5 h-5 text-purple-500" />
            <h2 className="text-md font-semibold text-white">Scenario Rollers</h2>
          </div>
          <div className="flex flex-col gap-6 flex-1 justify-center">
            <StrikeRoller />
            <ExpiryRoller />
          </div>
        </div>

        {/* Col 4-7: Payoff Chart */}
        <div className="xl:col-span-4 bg-[#131722] border border-[#2a2e39] rounded-xl p-5 shadow-lg flex flex-col h-[320px]">
          <div className="mb-3 flex justify-between shrink-0">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Payoff Curve</h3>
            <div className="flex gap-3 text-[10px] font-mono">
              <div className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#a78bfa] block"></span> T+0</div>
              <div className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#00c853] block"></span> Expiry</div>
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            <PayoffChart />
          </div>
        </div>

        {/* Col 8-12: Heatmap */}
        <div className="xl:col-span-5 bg-[#131722] border border-[#2a2e39] rounded-xl p-5 shadow-lg flex flex-col h-[320px]">
          <div className="mb-3 shrink-0">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">P&L Heatmap matrix</h3>
          </div>
          <div className="flex-1 min-h-0 relative">
            <Heatmap />
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Execution (Simulated Legs + Option Chain) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Simulated Legs Panel */}
        <div className="xl:col-span-3 bg-[#131722] border border-[#2a2e39] rounded-xl p-5 shadow-lg flex flex-col max-h-[500px]">
          <div className="flex items-center justify-between mb-4 border-b border-[#2a2e39] pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              <h2 className="text-md font-semibold text-white">Simulated Legs</h2>
            </div>
          </div>
          <span className="text-xs text-gray-500 italic mb-3 shrink-0">Click the Option Chain to add positions</span>
          
          <div className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-[150px]">
            {legs.map((leg) => (
              <div key={leg.id} className="bg-[#0a0a0a] border border-[#2a2e39] p-3 rounded-lg flex items-center justify-between group shrink-0">
                <div>
                  <div className="font-mono text-white text-xs font-semibold">{leg.symbol}</div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    <span className={leg.side === 'Long' ? 'text-green-500' : 'text-red-500'}>{leg.side}</span> {leg.size}x
                  </div>
                </div>
                <button 
                  onClick={() => removeLeg(leg.id)}
                  className="text-gray-600 hover:text-red-500 transition-colors p-1"
                >
                  &times;
                </button>
              </div>
            ))}
            {legs.length === 0 && (
              <div className="text-gray-500 text-xs text-center py-6 border border-dashed border-[#2a2e39] rounded-lg">
                No legs added
              </div>
            )}
          </div>
        </div>

        {/* Option Chain Panel */}
        <div className="xl:col-span-9 h-[500px]">
          <OptionChain />
        </div>
        
      </div>
    </div>
  );
};
