'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, Shield, Clock } from 'lucide-react';

interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

interface PnL {
  total: number;
  unrealized: number;
  realized: number;
}

export default function DashboardPage() {
  const [greeks, setGreeks] = useState<Greeks>({
    delta: 0,
    gamma: 0,
    theta: 0,
    vega: 0,
    rho: 0,
  });
  const [pnl, setPnl] = useState<PnL>({
    total: 2847.52,
    unrealized: 1234.56,
    realized: 1612.96,
  });
  const [positionsCount, setPositionsCount] = useState(5);
  const [pnlHistory, setPnlHistory] = useState<{ time: string; value: number }[]>([]);

  // Simulate P&L history updates
  useEffect(() => {
    const initialHistory = Array.from({ length: 20 }, (_, i) => ({
      time: new Date(Date.now() - (20 - i) * 5000).toLocaleTimeString(),
      value: 2500 + Math.random() * 500,
    }));
    setPnlHistory(initialHistory);

    const interval = setInterval(() => {
      setPnlHistory((prev) => {
        const newHistory = [
          ...prev.slice(-19),
          {
            time: new Date().toLocaleTimeString(),
            value: pnl.total + (Math.random() - 0.5) * 100,
          },
        ];
        return newHistory;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [pnl.total]);

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const getPnlColor = (value: number) => {
    return value >= 0 ? '#10b981' : '#ef4444';
  };

  const maxHistoryValue = Math.max(...pnlHistory.map((p) => Math.abs(p.value)), 1);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-black text-white uppercase italic mb-2">
          Trading Overview
        </h2>
        <p className="text-sm text-zinc-500">
          Monitor your portfolio performance and Greeks in real-time.
        </p>
      </div>

      {/* P&L Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-500 uppercase">Total P&L</span>
            <DollarSign className="w-4 h-4 text-zinc-600" />
          </div>
          <p className="text-2xl font-black" style={{ color: getPnlColor(pnl.total) }}>
            ${formatNumber(pnl.total)}
          </p>
        </div>

        <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-500 uppercase">Unrealized</span>
            <TrendingUp className="w-4 h-4 text-zinc-600" />
          </div>
          <p className="text-2xl font-black" style={{ color: getPnlColor(pnl.unrealized) }}>
            ${formatNumber(pnl.unrealized)}
          </p>
        </div>

        <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-500 uppercase">Realized</span>
            <TrendingDown className="w-4 h-4 text-zinc-600" />
          </div>
          <p className="text-2xl font-black" style={{ color: getPnlColor(pnl.realized) }}>
            ${formatNumber(pnl.realized)}
          </p>
        </div>

        <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-500 uppercase">Open Positions</span>
            <Activity className="w-4 h-4 text-zinc-600" />
          </div>
          <p className="text-2xl font-black text-white">{positionsCount}</p>
        </div>
      </section>

      {/* Greeks Cards */}
      <section className="mb-8">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">
          Portfolio Greeks
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <GreeksCard label="Delta" symbol="Δ" value={greeks.delta} color="blue" />
          <GreeksCard label="Gamma" symbol="Γ" value={greeks.gamma} color="purple" />
          <GreeksCard label="Theta" symbol="Θ" value={greeks.theta} color="orange" />
          <GreeksCard label="Vega" symbol="V" value={greeks.vega} color="green" />
          <GreeksCard label="Rho" symbol="Ρ" value={greeks.rho} color="red" />
        </div>
      </section>

      {/* P&L Chart */}
      <section className="bg-[#131722] border border-[#2a2e39] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">
            P&L Performance History
          </h3>
          <span className="flex items-center gap-2 text-xs text-green-500">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Live Data Feed
          </span>
        </div>

        <div className="h-48">
          <svg viewBox="0 0 400 150" className="w-full h-full">
            {/* Reference line */}
            <line
              x1="0"
              y1="75"
              x2="400"
              y2="75"
              stroke="#2a2e39"
              strokeWidth="1"
              strokeDasharray="4 4"
            />

            {/* Line chart path */}
            <path
              d={`M ${pnlHistory
                .map((point, index) => {
                  const x = (index / (pnlHistory.length - 1)) * 400;
                  const y = 75 - (point.value / maxHistoryValue) * 60;
                  return `${x} ${y}`;
                })
                .join(' L ')}`}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points */}
            {pnlHistory.map((point, index) => {
              const x = (index / (pnlHistory.length - 1)) * 400;
              const y = 75 - (point.value / maxHistoryValue) * 60;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="#131722"
                  stroke={getPnlColor(point.value)}
                  strokeWidth="2"
                />
              );
            })}
          </svg>
        </div>

        <div className="flex justify-between mt-2 text-xs text-zinc-600 font-mono">
          <span>{pnlHistory[0]?.time}</span>
          <span>Real-time tracking active</span>
          <span>{pnlHistory[pnlHistory.length - 1]?.time}</span>
        </div>
      </section>
    </div>
  );
}

interface GreeksCardProps {
  label: string;
  symbol: string;
  value: number;
  color: string;
}

function GreeksCard({ label, symbol, value, color }: GreeksCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-500 bg-blue-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
    green: 'text-green-500 bg-green-500/10',
    red: 'text-red-500 bg-red-500/10',
  };

  return (
    <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-black ${colorClasses[color]}`}
      >
        {symbol}
      </div>
      <div>
        <div className="text-xs font-bold text-zinc-500 uppercase">{label}</div>
        <div className="text-lg font-black text-white">{value.toFixed(4)}</div>
      </div>
    </div>
  );
}
