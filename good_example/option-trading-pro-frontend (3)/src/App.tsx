import React, { useState } from 'react';
import { StrategyBuilder } from './components/StrategyBuilder';
import { PortfolioTable } from './components/PortfolioTable';
import { GreeksWidget } from './components/GreeksWidget';
import { Activity, LayoutDashboard, Settings as SettingsIcon } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'builder' | 'portfolio' | 'settings'>('builder');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans">
      {/* Top Navbar */}
      <header className="h-16 border-b border-[#2a2e39] bg-[#131722] flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-green-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,200,83,0.3)]">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            OptionStrategist <span className="text-xs text-green-500 font-mono font-normal ml-2 tracking-widest uppercase">Pro 2026</span>
          </h1>
        </div>
        
        <nav className="flex gap-1">
          <button 
            onClick={() => setActiveTab('builder')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'builder' ? 'bg-[#2a2e39] text-white' : 'text-gray-400 hover:text-white hover:bg-[#2a2e39]/50'}`}
          >
            Strategy Builder
          </button>
          <button 
            onClick={() => setActiveTab('portfolio')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'portfolio' ? 'bg-[#2a2e39] text-white' : 'text-gray-400 hover:text-white hover:bg-[#2a2e39]/50'}`}
          >
            Live Portfolio
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'bg-[#2a2e39] text-white' : 'text-gray-400 hover:text-white hover:bg-[#2a2e39]/50'}`}
          >
            <SettingsIcon className="w-4 h-4" /> Settings
          </button>
        </nav>
        
        <div className="flex items-center gap-4">
          <div className="text-xs font-mono text-gray-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#00c853] animate-pulse"></span>
            Bybit V5 Feed
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-[1600px] mx-auto">
        {activeTab === 'builder' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 flex items-center gap-3">
              <LayoutDashboard className="w-6 h-6 text-gray-400" />
              <h2 className="text-2xl font-bold text-white">Interactive Strategy Builder</h2>
            </div>
            <StrategyBuilder />
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
            <div className="mb-2 flex items-center gap-3">
              <Activity className="w-6 h-6 text-gray-400" />
              <h2 className="text-2xl font-bold text-white">Institutional Portfolio Tracker</h2>
            </div>
            <GreeksWidget />
            <PortfolioTable />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto mt-12">
            <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
              
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <SettingsIcon className="w-6 h-6 text-blue-500" /> API Configuration
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2 font-mono">Bybit V5 API Key</label>
                  <input 
                    type="password" 
                    placeholder="Enter your API Key"
                    className="w-full bg-[#0a0a0a] border border-[#2a2e39] rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2 font-mono">Bybit V5 API Secret</label>
                  <input 
                    type="password" 
                    placeholder="Enter your API Secret"
                    className="w-full bg-[#0a0a0a] border border-[#2a2e39] rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
                  Connect Bybit V5
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;