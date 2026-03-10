'use client';

import React, { useState } from 'react';
import { useBuilderStore } from '@/store/builderStore';
import { X, Key, ShieldCheck, Save, Eye, EyeOff } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const bybitApiKey = useBuilderStore((state) => state.bybitApiKey);
  const bybitApiSecret = useBuilderStore((state) => state.bybitApiSecret);
  const setBybitCredentials = useBuilderStore((state) => state.setBybitCredentials);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setBybitCredentials(apiKey, apiSecret);
    onClose();
  };

  const currentApiKey = apiKey || bybitApiKey;
  const currentApiSecret = apiSecret || bybitApiSecret;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#131722] border border-[#2a2e39] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2a2e39]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-lg font-bold text-white uppercase tracking-tight">API Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <p className="text-xs text-zinc-400 leading-relaxed uppercase font-bold tracking-widest opacity-70">
            Configure your Bybit API keys to enable live trading and real-time portfolio tracking.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-2">
                <Key className="w-3 h-3" /> Bybit API Key
              </label>
                <input
                  type="text"
                value={currentApiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API Key"
                className="w-full bg-[#0a0a0a] border border-[#2a2e39] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-mono placeholder:text-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-3 h-3" /> Bybit API Secret
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={currentApiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter API Secret"
                  className="w-full bg-[#0a0a0a] border border-[#2a2e39] rounded-xl px-4 py-3 pr-12 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-mono placeholder:text-zinc-700"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex gap-3">
             <div className="text-yellow-500 shrink-0">⚠️</div>
             <p className="text-[10px] text-yellow-500 font-bold uppercase leading-normal">
                Keys are stored locally in your browser session. Never share your API Secret.
             </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-[#0a0a0a]/50 border-t border-[#2a2e39] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-widest transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 transition-all"
          >
            <Save className="w-4 h-4" /> Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
