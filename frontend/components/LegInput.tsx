'use client';

import React from 'react';
import { useBuilderStore } from '@/store/builderStore';
import { Plus, Trash2, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { OptionType, Side } from '@/types/options';

export default function LegInput() {
  const { addLeg, legs, removeLeg, calculate, isLoading } = useBuilderStore();
  
  const [newLeg, setNewLeg] = React.useState({
    type: 'CALL' as OptionType,
    side: 'LONG' as Side,
    strike: 3500,
    premium: 150,
    quantity: 1
  });

  const handleAdd = () => {
    addLeg({ ...newLeg });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Input Form */}
      <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <button 
            type="button"
            onClick={() => setNewLeg({...newLeg, type: 'CALL'})}
            className={`py-2 rounded-lg text-xs font-bold transition-all border ${newLeg.type === 'CALL' ? 'bg-[#2563eb] text-white border-[#3b82f6]' : 'bg-[#0a0a0a] text-zinc-500 border-[#2a2e39]'}`}
          >
            CALL
          </button>
          <button 
            type="button"
            onClick={() => setNewLeg({...newLeg, type: 'PUT'})}
            className={`py-2 rounded-lg text-xs font-bold transition-all border ${newLeg.type === 'PUT' ? 'bg-[#ea580c] text-white border-[#f97316]' : 'bg-[#0a0a0a] text-zinc-500 border-[#2a2e39]'}`}
          >
            PUT
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button 
            type="button"
            onClick={() => setNewLeg({...newLeg, side: 'LONG'})}
            className={`py-2 rounded-lg text-xs font-bold transition-all border ${newLeg.side === 'LONG' ? 'bg-[#16a34a26] text-[#4ade80] border-[#22c55e4d]' : 'bg-[#0a0a0a] text-zinc-500 border-[#2a2e39]'}`}
          >
            LONG
          </button>
          <button 
            type="button"
            onClick={() => setNewLeg({...newLeg, side: 'SHORT'})}
            className={`py-2 rounded-lg text-xs font-bold transition-all border ${newLeg.side === 'SHORT' ? 'bg-[#dc262626] text-[#f87171] border-[#ef44444d]' : 'bg-[#0a0a0a] text-zinc-500 border-[#2a2e39]'}`}
          >
            SHORT
          </button>
        </div>

        <div className="space-y-1">
          <label htmlFor="strike" className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Strike Price</label>
          <input 
            id="strike"
            type="number" 
            value={Number.isNaN(newLeg.strike) ? '' : newLeg.strike}
            onChange={(e) => {
              const val = e.target.value;
              setNewLeg({...newLeg, strike: val === '' ? NaN : parseFloat(val)});
            }}
            className="w-full bg-[#0a0a0a] border border-[#2a2e39] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6] transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="premium" className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Premium</label>
            <input 
              id="premium"
              type="number" 
              value={Number.isNaN(newLeg.premium) ? '' : newLeg.premium}
              onChange={(e) => {
                const val = e.target.value;
                setNewLeg({...newLeg, premium: val === '' ? NaN : parseFloat(val)});
              }}
              className="w-full bg-[#0a0a0a] border border-[#2a2e39] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="quantity" className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Quantity</label>
            <input 
              id="quantity"
              type="number" 
              value={Number.isNaN(newLeg.quantity) ? '' : newLeg.quantity}
              onChange={(e) => {
                const val = e.target.value;
                setNewLeg({...newLeg, quantity: val === '' ? NaN : parseInt(val)});
              }}
              className="w-full bg-[#0a0a0a] border border-[#2a2e39] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]"
            />
          </div>
        </div>

        <button 
          type="button"
          onClick={handleAdd}
          className="w-full mt-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-[background-color,transform] active:scale-95 shadow-lg shadow-blue-900/20"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> Add to Strategy
        </button>
      </div>

      {/* Legs List */}
      <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4 flex flex-col max-h-[400px]">
        <div className="flex items-center gap-2 mb-4 border-b border-[#2a2e39] pb-3">
          <Layers className="w-4 h-4 text-purple-500" aria-hidden="true" />
          <h2 className="text-[10px] font-bold text-white uppercase tracking-widest">Simulated Legs ({legs.length})</h2>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto pr-1">
          {legs.map((leg, index) => (
            <div key={index} className="bg-[#0a0a0a] border border-[#2a2e39] p-3 rounded-lg flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className={`w-1 h-8 rounded-full ${leg.side === 'LONG' ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black px-1 py-0.5 rounded ${leg.type === 'CALL' ? 'bg-[#1e3a8a66] text-blue-400' : 'bg-[#7c2d1266] text-orange-400'}`}>
                      {leg.type}
                    </span>
                    <span className="text-white font-mono font-bold text-xs">${leg.strike}</span>
                  </div>
                  <div className="text-[9px] text-zinc-500 mt-0.5 font-mono">
                    {leg.side} • {leg.quantity}x @ ${leg.premium}
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => removeLeg(index)}
                aria-label="Remove leg"
                className="text-zinc-600 hover:text-[#ef4444] transition-colors"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          
          {legs.length === 0 && (
            <div className="py-6 flex flex-col items-center justify-center border border-dashed border-[#2a2e39] rounded-lg">
              <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-tighter">No positions added</span>
            </div>
          )}
        </div>

        {legs.length > 0 && (
          <button 
            type="button"
            onClick={() => calculate()}
            disabled={isLoading}
            className="w-full mt-4 bg-[#16a34a] hover:bg-[#15803d] disabled:bg-zinc-800 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-[background-color,transform] active:scale-95 shadow-lg shadow-green-900/20"
          >
            {isLoading ? 'Running Quants…' : 'Calculate Strategy'}
          </button>
        )}
      </div>
    </div>
  );
}
