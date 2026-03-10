'use client';

import React, { useState } from 'react';
import { Bell, BellOff, Trash2, Clock, AlertTriangle } from 'lucide-react';

interface Alert {
  id: string;
  type: 'price' | 'pnl' | 'greek';
  symbol: string;
  condition: string;
  value: number;
  triggered: boolean;
  createdAt: string;
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'price',
    symbol: 'ETH',
    condition: 'price_above',
    value: 3600,
    triggered: false,
    createdAt: '2026-03-07 14:30',
  },
  {
    id: '2',
    type: 'pnl',
    symbol: 'ETH',
    condition: 'pnl_below',
    value: -500,
    triggered: true,
    createdAt: '2026-03-07 10:15',
  },
  {
    id: '3',
    type: 'greek',
    symbol: 'ETH',
    condition: 'delta_above',
    value: 0.8,
    triggered: false,
    createdAt: '2026-03-06 16:45',
  },
  {
    id: '4',
    type: 'price',
    symbol: 'ETH',
    condition: 'price_below',
    value: 3300,
    triggered: false,
    createdAt: '2026-03-06 09:00',
  },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleDelete = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleToggle = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, triggered: !a.triggered } : a))
    );
  };

  const triggeredCount = alerts.filter((a) => a.triggered).length;
  const activeCount = alerts.length - triggeredCount;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic mb-2">
            Price Alerts
          </h2>
          <p className="text-sm text-zinc-500">
            Get notified when market conditions meet your criteria
          </p>
        </div>

        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-all"
        >
          <Bell className="w-4 h-4" />
          Create Alert
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="w-4 h-4 text-zinc-500" />
            <div className="text-xs font-bold text-zinc-500 uppercase">Total Alerts</div>
          </div>
          <div className="text-2xl font-black text-white">{alerts.length}</div>
        </div>
        <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <div className="text-xs font-bold text-zinc-500 uppercase">Active</div>
          </div>
          <div className="text-2xl font-black text-blue-500">{activeCount}</div>
        </div>
        <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <div className="text-xs font-bold text-zinc-500 uppercase">Triggered</div>
          </div>
          <div className="text-2xl font-black text-orange-500">{triggeredCount}</div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-[#131722] border border-[#2a2e39] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0a0a0a] border-b border-[#2a2e39]">
            <tr>
              <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">
                Type
              </th>
              <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">
                Symbol
              </th>
              <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">
                Condition
              </th>
              <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">
                Value
              </th>
              <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">
                Status
              </th>
              <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">
                Created
              </th>
              <th className="text-left text-xs font-bold text-zinc-500 uppercase py-4 px-4">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2e39]">
            {alerts.map((alert) => (
              <tr
                key={alert.id}
                className={`hover:bg-[#1a1e2a] transition-colors ${
                  alert.triggered ? 'bg-orange-500/5' : ''
                }`}
              >
                <td className="py-4 px-4">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      alert.type === 'price'
                        ? 'bg-blue-500/10 text-blue-500'
                        : alert.type === 'pnl'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-purple-500/10 text-purple-500'
                    }`}
                  >
                    {alert.type === 'price' && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" x2="12" y1="2" y2="22" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    )}
                    {alert.type === 'pnl' && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" x2="12" y1="2" y2="22" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    )}
                    {alert.type === 'greek' && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="font-bold text-white">{alert.symbol}</span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm text-zinc-300 capitalize">
                    {alert.condition.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className="font-mono text-white">${alert.value}</span>
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      alert.triggered
                        ? 'bg-orange-500/10 text-orange-500'
                        : 'bg-blue-500/10 text-blue-500'
                    }`}
                  >
                    {alert.triggered ? 'Triggered' : 'Active'}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm text-zinc-400 font-mono">{alert.createdAt}</span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(alert.id)}
                      className="p-1.5 hover:bg-[#2a2e39] rounded transition-colors text-zinc-400 hover:text-white"
                      title={alert.triggered ? 'Mark as unread' : 'Mark as triggered'}
                    >
                      {alert.triggered ? (
                        <BellOff className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="p-1.5 hover:bg-red-500/10 rounded transition-colors text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {alerts.length === 0 && (
          <div className="p-12 text-center text-zinc-500">
            <BellOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No alerts configured</p>
            <p className="text-xs mt-1">Create your first alert to get started</p>
          </div>
        )}
      </div>

      {/* Create Alert Modal */}
      {showCreateForm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowCreateForm(false)}
        >
          <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-black text-white uppercase italic mb-4">
              Create New Alert
            </h3>
            <p className="text-sm text-zinc-500 mb-4">Alert configuration form coming soon...</p>
            <button
              onClick={() => setShowCreateForm(false)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
