import React, { useEffect } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';
import { Activity } from 'lucide-react';

export const GreeksWidget: React.FC = () => {
  const { netGreeks, totalUnrealizedPnl, recalculateNetGreeks } = usePortfolioStore();

  useEffect(() => {
    recalculateNetGreeks();
  }, [recalculateNetGreeks]);

  const GreekBox = ({ label, value, colorClass }: { label: string, value: number, colorClass: string }) => (
    <div className="flex-1 flex flex-col justify-between items-center bg-[#0a0a0a] border border-[#2a2e39] rounded-lg p-3 sm:p-4 shadow-inner">
      <span className="text-gray-500 font-medium text-xs sm:text-sm uppercase tracking-wider">{label}</span>
      <span className={`text-lg sm:text-xl font-bold font-mono mt-1 ${colorClass}`}>
        {value >= 0 && label !== 'Γ' && label !== 'V' ? '+' : ''}{value.toFixed(4)}
      </span>
    </div>
  );

  return (
    <div className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl p-4 sm:p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-white">Aggregated Portfolio Greeks</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Net U-PnL:</span>
          <span className={`font-mono font-bold ${totalUnrealizedPnl >= 0 ? 'text-[#00c853]' : 'text-[#d50000]'}`}>
            {totalUnrealizedPnl >= 0 ? '+$' : '-$'}{Math.abs(totalUnrealizedPnl).toFixed(2)}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <GreekBox label="Δ Net Delta" value={netGreeks.delta} colorClass={netGreeks.delta >= 0 ? 'text-green-400' : 'text-red-400'} />
        <GreekBox label="Γ Net Gamma" value={netGreeks.gamma} colorClass="text-blue-400" />
        <GreekBox label="Θ Net Theta" value={netGreeks.theta} colorClass={netGreeks.theta >= 0 ? 'text-green-400' : 'text-red-400'} />
        <GreekBox label="V Net Vega" value={netGreeks.vega} colorClass="text-purple-400" />
      </div>
    </div>
  );
};
