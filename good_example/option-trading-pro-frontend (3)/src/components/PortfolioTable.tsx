import React from 'react';
import { usePortfolioStore } from '../store/portfolioStore';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export const PortfolioTable: React.FC = () => {
  const { positions } = usePortfolioStore();

  return (
    <div className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl overflow-hidden shadow-lg">
      <div className="px-6 py-4 border-b border-[#2a2e39] flex items-center gap-3">
        <DollarSign className="w-5 h-5 text-green-500" />
        <h2 className="text-lg font-semibold text-white">Live Positions</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-400 font-mono">
          <thead className="text-xs text-gray-500 uppercase bg-[#0a0a0a]">
            <tr>
              <th className="px-6 py-3">Symbol</th>
              <th className="px-6 py-3">Side</th>
              <th className="px-6 py-3">Size</th>
              <th className="px-6 py-3">Avg Price</th>
              <th className="px-6 py-3">Mark Price</th>
              <th className="px-6 py-3">Unrealized PnL</th>
              <th className="px-6 py-3">Δ</th>
              <th className="px-6 py-3">Γ</th>
              <th className="px-6 py-3">Θ</th>
              <th className="px-6 py-3">V</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => {
              const isProfit = pos.unrealizedPnl >= 0;
              return (
                <tr key={pos.id} className="border-b border-[#2a2e39] hover:bg-[#2a2e39]/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                    {pos.symbol}
                  </td>
                  <td className={clsx("px-6 py-4", pos.side === 'Long' ? 'text-green-500' : 'text-red-500')}>
                    {pos.side}
                  </td>
                  <td className="px-6 py-4">{pos.size}</td>
                  <td className="px-6 py-4">${pos.entryPrice}</td>
                  <td className="px-6 py-4">${pos.markPrice}</td>
                  <td className={clsx("px-6 py-4 font-bold flex items-center gap-1", isProfit ? 'text-[#00c853]' : 'text-[#d50000]')}>
                    {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    ${Math.abs(pos.unrealizedPnl).toFixed(2)}
                  </td>
                  <td className={clsx("px-6 py-4", pos.greeks.delta >= 0 ? 'text-green-400' : 'text-red-400')}>{pos.greeks.delta.toFixed(3)}</td>
                  <td className="px-6 py-4 text-blue-400">{pos.greeks.gamma.toFixed(4)}</td>
                  <td className={clsx("px-6 py-4", pos.greeks.theta >= 0 ? 'text-green-400' : 'text-red-400')}>{pos.greeks.theta.toFixed(2)}</td>
                  <td className="px-6 py-4 text-purple-400">{pos.greeks.vega.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {positions.length === 0 && (
        <div className="p-8 text-center text-gray-500 font-mono">No active positions. Connect API to sync.</div>
      )}
    </div>
  );
};
