'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Trash2, Edit, Wifi, WifiOff } from 'lucide-react';
import { usePositionsWebSocket } from '@/src/hooks/usePositionsWebSocket';

interface Position {
  id: string;
  symbol: string;
  type: 'CALL' | 'PUT';
  side: 'BUY' | 'SELL';
  size: string;
  entryPrice: string;
  markPrice: string;
  positionValue: number;
  unrealisedPnl: number;
  unrealisedPnlPercent: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

interface PortfolioGreeks {
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
}

export default function PositionsPage() {
  const [positionType, setPositionType] = useState<'virtual' | 'real'>('virtual');
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // WebSocket for real-time positions (backend on port 8080)
  const wsUrl = typeof window !== 'undefined' 
    ? `ws://${window.location.hostname}:8080/ws/positions`
    : 'ws://localhost:8080/ws/positions';
  
  const {
    connected,
    positions: wsPositions,
    error: wsError,
    lastUpdate: wsLastUpdate
  } = usePositionsWebSocket(wsUrl);

  // Handle WebSocket positions updates
  useEffect(() => {
    if (positionType === 'real' && wsPositions.length > 0) {
      const formattedPositions = wsPositions.map((pos) => ({
        id: pos.symbol,
        symbol: pos.symbol.split('-')[0] || 'ETH',
        optionSymbol: pos.symbol,
        type: pos.symbol.includes('C') ? 'CALL' : 'PUT',
        side: pos.side === 'Buy' ? 'BUY' : 'SELL',
        size: pos.size,
        entryPrice: pos.avgPrice,
        markPrice: pos.markPrice,
        positionValue: pos.positionValue,
        unrealisedPnl: pos.unrealisedPnl,
        unrealisedPnlPercent: pos.unrealisedPnlPct,
        delta: pos.delta,
        gamma: pos.gamma,
        theta: pos.theta,
        vega: pos.vega,
      }));
      setPositions(formattedPositions);
      setLastUpdate(wsLastUpdate);
      setIsLoading(false);
    }
  }, [wsPositions, wsLastUpdate, positionType]);

  const fetchPositions = useCallback(() => {
    if (positionType === 'virtual') {
      setPositions(mockPositions);
      setLastUpdate(new Date());
      return;
    }

    // For real positions, WebSocket will handle updates
    // Just set loading state
    setIsLoading(true);
  }, [positionType]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const handleRefresh = () => {
    fetchPositions();
  };

  const handleDelete = (id: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  };

  const totalPnl = positions.reduce((sum, p) => sum + p.unrealisedPnl, 0);
  const totalPositions = positions.length;

  // Calculate portfolio Greeks
  const portfolioGreeks: PortfolioGreeks = positions.reduce(
    (acc, pos) => ({
      totalDelta: acc.totalDelta + pos.delta * parseFloat(pos.size),
      totalGamma: acc.totalGamma + pos.gamma * parseFloat(pos.size),
      totalTheta: acc.totalTheta + pos.theta * parseFloat(pos.size),
      totalVega: acc.totalVega + pos.vega * parseFloat(pos.size),
    }),
    { totalDelta: 0, totalGamma: 0, totalTheta: 0, totalVega: 0 }
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic mb-2">
            Portfolio Management
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPositionType('virtual')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                positionType === 'virtual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#131722] text-zinc-400 border border-[#2a2e39]'
              }`}
            >
              Virtual Portfolio
            </button>
            <button
              onClick={() => setPositionType('real')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                positionType === 'real'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#131722] text-zinc-400 border border-[#2a2e39]'
              }`}
            >
              Bybit Real Account
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {positionType === 'real' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-lg">
              {connected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-orange-500" />
              )}
              <span className="text-xs text-zinc-400">
                {connected ? 'Live' : 'Connecting...'}
              </span>
              {lastUpdate && (
                <span className="text-xs text-zinc-600 ml-2">
                  {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#131722] border border-[#2a2e39] rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:border-blue-500 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {positionType === 'virtual' && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-all"
            >
              <Plus className="w-4 h-4" />
              New Position
            </button>
          )}
        </div>
      </div>

      {/* Portfolio Greeks Summary */}
      {positionType === 'real' && positions.length > 0 && (
        <div className="mb-6 grid grid-cols-5 gap-4">
          <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4">
            <div className="text-xs font-bold text-zinc-500 uppercase mb-2">Total P&L</div>
            <div className={`text-2xl font-black ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${totalPnl.toFixed(2)}
            </div>
          </div>
          <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4">
            <div className="text-xs font-bold text-zinc-500 uppercase mb-2">Portfolio Delta</div>
            <div className={`text-2xl font-black ${portfolioGreeks.totalDelta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {portfolioGreeks.totalDelta >= 0 ? '+' : ''}{portfolioGreeks.totalDelta.toFixed(4)}
            </div>
          </div>
          <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4">
            <div className="text-xs font-bold text-zinc-500 uppercase mb-2">Portfolio Gamma</div>
            <div className={`text-2xl font-black ${portfolioGreeks.totalGamma >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {portfolioGreeks.totalGamma >= 0 ? '+' : ''}{portfolioGreeks.totalGamma.toFixed(6)}
            </div>
          </div>
          <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4">
            <div className="text-xs font-bold text-zinc-500 uppercase mb-2">Portfolio Theta</div>
            <div className={`text-2xl font-black ${portfolioGreeks.totalTheta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {portfolioGreeks.totalTheta >= 0 ? '+' : ''}{portfolioGreeks.totalTheta.toFixed(6)}
            </div>
          </div>
          <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4">
            <div className="text-xs font-bold text-zinc-500 uppercase mb-2">Portfolio Vega</div>
            <div className={`text-2xl font-black ${portfolioGreeks.totalVega >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {portfolioGreeks.totalVega >= 0 ? '+' : ''}{portfolioGreeks.totalVega.toFixed(6)}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4">
          <div className="text-xs font-bold text-zinc-500 uppercase mb-2">Total Positions</div>
          <div className="text-2xl font-black text-white">{totalPositions}</div>
        </div>
        <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4">
          <div className="text-xs font-bold text-zinc-500 uppercase mb-2">Total P&L</div>
          <div className={`text-2xl font-black ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ${totalPnl.toFixed(2)}
          </div>
        </div>
        <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4">
          <div className="text-xs font-bold text-zinc-500 uppercase mb-2">Portfolio Type</div>
          <div className="text-2xl font-black text-white capitalize">{positionType}</div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-xl">
          <p className="text-red-500 text-sm font-medium">{error}</p>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center p-12 bg-[#131722] border border-[#2a2e39] rounded-xl">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-zinc-400">Loading positions from Bybit...</span>
        </div>
      )}

      {!isLoading && positions.length > 0 && (
        <div className="bg-[#131722] border border-[#2a2e39] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0a0a0a] border-b border-[#2a2e39]">
              <tr>
                <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">Symbol</th>
                <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">Type</th>
                <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">Side</th>
                <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">Size</th>
                <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">Cost</th>
                <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">Mark</th>
                <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">P&L</th>
                <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">P&L %</th>
                <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">Δ Delta</th>
                <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">Γ Gamma</th>
                <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">Θ Theta</th>
                <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">V Vega</th>
                <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2e39]">
              {positions.map((position) => (
                <tr key={position.id} className="hover:bg-[#1a1e2a] transition-colors">
                  <td className="py-4 px-4">
                    <div>
                      <span className="font-bold text-white block">{position.symbol}</span>
                      <span className="text-xs text-zinc-500 font-mono">{position.optionSymbol}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      position.type === 'CALL' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}>{position.type}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      position.side === 'BUY' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'
                    }`}>{position.side}</span>
                  </td>
                  <td className="py-4 px-4 text-white font-mono">{position.size}</td>
                  <td className="py-4 px-4 text-white font-mono">${position.positionValue.toFixed(2)}</td>
                  <td className="py-4 px-4 text-white font-mono">${parseFloat(position.markPrice).toFixed(2)}</td>
                  <td className="py-4 px-4">
                    <span className={`font-mono font-bold ${position.unrealisedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {position.unrealisedPnl >= 0 ? '+' : ''}${position.unrealisedPnl.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`font-mono text-sm ${position.unrealisedPnlPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {position.unrealisedPnlPercent >= 0 ? '+' : ''}{position.unrealisedPnlPercent.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`font-mono text-sm ${position.delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {position.delta >= 0 ? '+' : ''}{position.delta.toFixed(4)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`font-mono text-sm ${position.gamma >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {position.gamma >= 0 ? '+' : ''}{position.gamma.toFixed(6)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`font-mono text-sm ${position.theta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {position.theta >= 0 ? '+' : ''}{position.theta.toFixed(6)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`font-mono text-sm ${position.vega >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {position.vega >= 0 ? '+' : ''}{position.vega.toFixed(6)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 hover:bg-[#2a2e39] rounded transition-colors text-zinc-400 hover:text-white">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(position.id)} className="p-1.5 hover:bg-red-500/10 rounded transition-colors text-zinc-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && positions.length === 0 && (
        <div className="p-12 text-center text-zinc-500 bg-[#131722] border border-[#2a2e39] rounded-xl">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No positions found</p>
          <p className="text-xs mt-1">
            {positionType === 'real' ? 'No option positions in your Bybit account' : 'Add your first position to get started'}
          </p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-black text-white uppercase italic mb-4">Add New Position</h3>
            <p className="text-sm text-zinc-500 mb-4">Position form coming soon...</p>
            <button onClick={() => setShowForm(false)} className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-all">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Activity({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

const mockPositions: Position[] = [
  { id: '1', symbol: 'ETH', type: 'CALL', side: 'BUY', size: '10', positionValue: 1500, markPrice: '195.05', unrealisedPnl: 450.50, unrealisedPnlPercent: 30.03, delta: 0.65, gamma: 0.02, theta: -5.2, vega: 12.3 },
  { id: '2', symbol: 'ETH', type: 'PUT', side: 'SELL', size: '5', positionValue: 600, markPrice: '145.06', unrealisedPnl: -125.30, unrealisedPnlPercent: -20.88, delta: -0.35, gamma: 0.018, theta: 3.1, vega: -8.5 },
  { id: '3', symbol: 'ETH', type: 'CALL', side: 'SELL', size: '8', positionValue: 640, markPrice: '51.25', unrealisedPnl: 230.00, unrealisedPnlPercent: 35.94, delta: -0.25, gamma: 0.015, theta: 4.5, vega: -10.2 },
];
