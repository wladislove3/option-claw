import React from 'react';
import { useBuilderStore } from '../store/builderStore';
import { generateMockChain, CURRENT_BTC_PRICE } from '../data/mockOptions';
import { OptionLeg } from '../types';

const MOCK_CHAIN = generateMockChain();

export const OptionChain: React.FC = () => {
  const { addLeg, targetDaysToExpiry } = useBuilderStore();

  const handleAddLeg = (
    type: 'Call' | 'Put',
    side: 'Long' | 'Short',
    strike: number,
    price: number,
    iv: number
  ) => {
    const newLeg: OptionLeg = {
      id: `${type}-${strike}-${side}-${Date.now()}`,
      symbol: `BTC-${targetDaysToExpiry}D-${strike}-${type.charAt(0)}`,
      type,
      side,
      strike,
      expiry: targetDaysToExpiry,
      size: 1,
      iv,
      entryPrice: price,
    };
    addLeg(newLeg);
  };

  return (
    <div className="bg-[#131722] border border-[#2a2e39] rounded-xl flex flex-col shadow-lg overflow-hidden h-full">
      <div className="bg-[#1a1e29] border-b border-[#2a2e39] p-4 flex justify-between items-center shrink-0">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Live Option Chain</h2>
        <span className="text-xs font-mono text-[#00c853]">Spot: ${CURRENT_BTC_PRICE.toLocaleString()}</span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs font-mono text-right border-collapse relative">
          <thead className="sticky top-0 bg-[#1a1e29] z-10 shadow-md">
            <tr>
              <th colSpan={3} className="p-2 text-center font-bold text-green-500 border-r border-b border-[#2a2e39] bg-[#1a1e29]/90 backdrop-blur">CALLS</th>
              <th className="p-2 text-center text-white font-semibold bg-[#2a2e39] border-x border-b border-[#3b4050]">STRIKE</th>
              <th colSpan={3} className="p-2 text-center font-bold text-red-500 border-l border-b border-[#2a2e39] bg-[#1a1e29]/90 backdrop-blur">PUTS</th>
            </tr>
            <tr>
              {/* Calls Header */}
              <th className="p-2 text-gray-400 font-normal border-r border-[#2a2e39] border-b bg-[#1a1e29]">IV</th>
              <th className="p-2 text-gray-400 font-normal border-r border-[#2a2e39] border-b bg-[#1a1e29]">Bid</th>
              <th className="p-2 text-gray-400 font-normal border-r border-[#2a2e39] border-b bg-[#1a1e29]">Ask</th>
              {/* Strike Header */}
              <th className="p-2 text-center border-x border-[#3b4050] border-b bg-[#2a2e39]"></th>
              {/* Puts Header */}
              <th className="p-2 text-gray-400 font-normal border-l border-[#2a2e39] border-b bg-[#1a1e29]">Bid</th>
              <th className="p-2 text-gray-400 font-normal border-l border-[#2a2e39] border-b bg-[#1a1e29]">Ask</th>
              <th className="p-2 text-gray-400 font-normal border-b border-[#2a2e39] bg-[#1a1e29]">IV</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_CHAIN.strikes.map((strike, i) => {
              const call = MOCK_CHAIN.calls[i];
              const put = MOCK_CHAIN.puts[i];
              const isITMCall = strike < CURRENT_BTC_PRICE;
              const isITMPut = strike > CURRENT_BTC_PRICE;

              return (
                <tr key={strike} className="hover:bg-[#1a1e29] transition-colors border-b border-[#2a2e39] group cursor-pointer">
                  {/* Calls */}
                  <td className={`p-2 border-r border-[#2a2e39] ${isITMCall ? 'bg-[#18201a]' : ''}`}>
                    {(call.iv * 100).toFixed(1)}%
                  </td>
                  <td 
                    className={`p-2 border-r border-[#2a2e39] hover:bg-red-900/40 text-red-400 transition-colors ${isITMCall ? 'bg-[#18201a]' : ''}`}
                    onClick={() => handleAddLeg('Call', 'Short', strike, call.bid, call.iv)}
                    title="Sell Call"
                  >
                    {call.bid.toFixed(1)}
                  </td>
                  <td 
                    className={`p-2 border-r border-[#2a2e39] hover:bg-green-900/40 text-green-400 transition-colors ${isITMCall ? 'bg-[#18201a]' : ''}`}
                    onClick={() => handleAddLeg('Call', 'Long', strike, call.ask, call.iv)}
                    title="Buy Call"
                  >
                    {call.ask.toFixed(1)}
                  </td>

                  {/* Strike */}
                  <td className={`p-2 text-center font-bold border-x border-[#3b4050] group-hover:bg-[#2a2e39] ${strike === CURRENT_BTC_PRICE ? 'bg-blue-600/30 text-blue-400' : 'bg-[#1a1e29] text-white'}`}>
                    {strike.toLocaleString()}
                  </td>

                  {/* Puts */}
                  <td 
                    className={`p-2 border-l border-[#2a2e39] hover:bg-red-900/40 text-red-400 transition-colors ${isITMPut ? 'bg-[#18201a]' : ''}`}
                    onClick={() => handleAddLeg('Put', 'Short', strike, put.bid, put.iv)}
                    title="Sell Put"
                  >
                    {put.bid.toFixed(1)}
                  </td>
                  <td 
                    className={`p-2 border-l border-[#2a2e39] hover:bg-green-900/40 text-green-400 transition-colors ${isITMPut ? 'bg-[#18201a]' : ''}`}
                    onClick={() => handleAddLeg('Put', 'Long', strike, put.ask, put.iv)}
                    title="Buy Put"
                  >
                    {put.ask.toFixed(1)}
                  </td>
                  <td className={`p-2 border-l border-[#2a2e39] ${isITMPut ? 'bg-[#18201a]' : ''}`}>
                    {(put.iv * 100).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
