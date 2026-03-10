'use client';

import React from 'react';
import Link from 'next/link';
import { useBuilderStore } from '@/store/builderStore';
import Heatmap from '@/components/Heatmap';
import LegInput from '@/components/LegInput';
import SettingsModal from '@/components/SettingsModal';
import OptionChain from '@/components/OptionChain';
import { Activity, LayoutDashboard, Settings2, BarChart3, TrendingUp, Settings, User } from 'lucide-react';

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [selectedExpiry, setSelectedExpiry] = React.useState<string | undefined>(undefined);
  const underlyingPrice = useBuilderStore((state) => state.underlyingPrice);
  const setUnderlyingPrice = useBuilderStore((state) => state.setUnderlyingPrice);
  const volatility = useBuilderStore((state) => state.volatility);
  const setVolatility = useBuilderStore((state) => state.setVolatility);
  const daysToExpiry = useBuilderStore((state) => state.daysToExpiry);
  const setDaysToExpiry = useBuilderStore((state) => state.setDaysToExpiry);
  const matrixData = useBuilderStore((state) => state.matrixData);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-zinc-300 p-6 selection:bg-blue-500/30">
      {/* Header */}
      <div className="max-w-[1600px] mx-auto flex items-center justify-between mb-8 border-b border-[#2a2e39] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
            <LayoutDashboard className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">Option Pro v2.0</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Live Quants Engine • ETH Analytics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
             <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">ETH Market Spot</div>
             <div className="text-lg font-black text-white italic">${underlyingPrice.toFixed(2)}</div>
          </div>
          <div className="w-px h-8 bg-[#2a2e39]" />
          <div className="flex gap-2">
             <Link
                href="/cabinet"
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-all"
             >
                <User className="w-4 h-4" />
                Cabinet
             </Link>
             <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 bg-[#131722] border border-[#2a2e39] rounded-lg hover:bg-[#2a2e39] transition-colors group"
                title="API Settings"
             >
                <Settings className="w-4 h-4 text-zinc-500 group-hover:text-blue-500 transition-colors" />
             </button>
             <div className="p-2 bg-[#131722] border border-[#2a2e39] rounded-lg">
                <TrendingUp className="w-4 h-4 text-green-500" />
             </div>
          </div>
        </div>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* Left Column: Scenario Parameters and Legs */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-5 shadow-xl">
             <div className="flex items-center gap-3 mb-6 border-b border-[#2a2e39] pb-4">
                <Settings2 className="w-4 h-4 text-blue-500" />
                <h2 className="text-xs font-bold text-white uppercase tracking-widest">Scenario Parameters</h2>
             </div>

             <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] text-zinc-500 font-black uppercase">
                    <span>Spot Price</span>
                    <span className="text-blue-400">${underlyingPrice}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="range" min="1000" max="10000" step="10"
                      value={underlyingPrice}
                      onChange={(e) => setUnderlyingPrice(parseInt(e.target.value))}
                      className="flex-1 accent-blue-600"
                    />
                    <input
                      type="number"
                      value={underlyingPrice}
                      onChange={(e) => setUnderlyingPrice(parseInt(e.target.value) || 0)}
                      className="w-24 bg-[#0a0a0a] border border-[#2a2e39] rounded-lg px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-blue-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] text-zinc-500 font-black uppercase">
                    <span>Volatility (IV)</span>
                    <span className="text-purple-400">{(volatility * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="range" min="0.01" max="2.0" step="0.01"
                      value={volatility}
                      onChange={(e) => setVolatility(parseFloat(e.target.value))}
                      className="flex-1 accent-purple-600"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="2.0"
                      value={(volatility * 100).toFixed(0)}
                      onChange={(e) => setVolatility((parseFloat(e.target.value) || 0) / 100)}
                      className="w-20 bg-[#0a0a0a] border border-[#2a2e39] rounded-lg px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                    <span className="text-zinc-500 text-sm font-bold">%</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] text-zinc-500 font-black uppercase">
                    <span>Days to Expiry</span>
                    <span className="text-orange-400">{daysToExpiry}d</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="range" min="1" max="365" step="1"
                      value={daysToExpiry}
                      onChange={(e) => setDaysToExpiry(parseInt(e.target.value))}
                      className="flex-1 accent-orange-600"
                    />
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={daysToExpiry}
                      onChange={(e) => setDaysToExpiry(parseInt(e.target.value) || 0)}
                      className="w-20 bg-[#0a0a0a] border border-[#2a2e39] rounded-lg px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-orange-500 transition-colors font-mono"
                    />
                    <span className="text-zinc-500 text-sm font-bold">d</span>
                  </div>
                </div>
             </div>
          </div>

          <LegInput />
        </div>

        {/* Right Column: Visualization */}
        <div className="xl:col-span-9 space-y-6">
           {/* Top Stats */}
           <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4">
                 <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Max Profit Potential</div>
                 <div className="text-xl font-black text-green-500 italic">
                    {matrixData ? `+$${matrixData.max_profit.toFixed(2)}` : '---'}
                 </div>
              </div>
              <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4">
                 <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Max Capital At Risk</div>
                 <div className="text-xl font-black text-red-500 italic">
                    {matrixData ? `-$${Math.abs(matrixData.max_loss).toFixed(2)}` : '---'}
                 </div>
              </div>
              <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4">
                 <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Breakeven Points</div>
                 <div className="text-sm font-black text-white uppercase italic">
                    {matrixData?.breakevens && matrixData.breakevens.length > 0 ? matrixData.breakevens.map(b => `$${b.toFixed(0)}`).join(' / ') : 'N/A'}
                 </div>
              </div>
           </div>

           {/* Heatmap Section */}
           <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-5 shadow-2xl h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-6 border-b border-[#2a2e39] pb-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-green-500" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest italic">P&L Heatmap matrix (Price vs Time Decay)</h2>
                </div>
                {matrixData && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 uppercase font-black">Resolution: 100x50 Matrix</span>
                    <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] font-mono text-zinc-400">WSL2 Accelerated</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-h-0">
                <Heatmap />
              </div>
           </div>

           {/* Live Option Chain */}
           <OptionChain 
             selectedExpiry={selectedExpiry} 
             onExpiryChange={(expiry) => {
               setSelectedExpiry(expiry);
               const days = Math.floor((parseInt(expiry) - Date.now()) / (1000 * 60 * 60 * 24));
               if (days > 0) setDaysToExpiry(days);
             }}
             onUnderlyingChange={(price) => {
               setUnderlyingPrice(price);
             }}
           />
        </div>

      </div>

      {/* Page Footer */}
      <div className="max-w-[1600px] mx-auto mt-6 flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#2a2e39] rounded-xl">
        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          <Activity className="w-4 h-4 text-blue-500" />
          Backend Engine: Golang 1.22 • Black-Scholes Numerical Integration
        </div>
        <div suppressHydrationWarning className="text-[10px] text-zinc-600 font-mono">
          System Time: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </main>
  );
}
