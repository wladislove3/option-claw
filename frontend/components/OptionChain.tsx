'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Table, Clock, RefreshCw, WifiOff, Bitcoin } from 'lucide-react';

const OPTION_CHAIN_WS_URL = 'wss://stream.bybit.com/v5/public/option';
const OPTION_CHAIN_MAX_RECONNECTS = 6;
const OPTION_CHAIN_BASE_RECONNECT_MS = 2000;

interface OptionTicker {
  symbol: string;
  bidPrice: string;
  askPrice: string;
  lastPrice: string;
  markPrice: string;
  markIv: string;
  underlyingPrice: string;
  deliveryTime: string | number;
  totalVolume: string;
  baseCoin: string;
}

interface BybitOptionInstrument {
  status: string;
  baseCoin: string;
  symbol: string;
  deliveryTime: string | number;
  bid1Price?: string;
  ask1Price?: string;
  lastPrice?: string;
  markPrice?: string;
  markIv?: string;
  volume24h?: string;
  optionsType: 'Call' | 'Put';
}

interface OptionChainProxyResponse {
  underlyingPrice: number;
  instruments: BybitOptionInstrument[];
}

interface OptionChainProps {
  selectedExpiry?: string;
  onExpiryChange?: (expiryTime: string) => void;
  onUnderlyingChange?: (price: number) => void;
}

interface OptionRow {
  strike: number;
  call?: OptionTicker;
  put?: OptionTicker;
}

function getStrikeFromSymbol(symbol: string): number {
  const parts = symbol.split('-');
  return parts.length >= 3 ? Number.parseInt(parts[2], 10) || 0 : 0;
}

function formatPrice(price: string): string {
  const num = Number.parseFloat(price) || 0;
  return num.toFixed(2);
}

function formatIV(iv: string): string {
  const num = Number.parseFloat(iv) || 0;
  return `${(num * 100).toFixed(1)}%`;
}

function formatExpiry(timestamp: string | number): string {
  const ts = typeof timestamp === 'string' ? Number.parseInt(timestamp, 10) : timestamp;
  if (!ts || ts <= 0) return 'Invalid Date';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeToExpiry(timestamp: string | number): string {
  const ts = typeof timestamp === 'string' ? Number.parseInt(timestamp, 10) : timestamp;
  if (!ts || ts <= 0) return 'N/A';
  const days = Math.floor((ts - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Expired';
  return `${days}d`;
}

export default function OptionChain({ selectedExpiry, onExpiryChange, onUnderlyingChange }: OptionChainProps) {
  const [instruments, setInstruments] = useState<BybitOptionInstrument[]>([]);
  const [underlyingPrice, setUnderlyingPrice] = useState(0);
  const [expiryTimes, setExpiryTimes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [baseCoin, setBaseCoin] = useState<'BTC' | 'ETH'>('BTC');
  const [quotesVersion, setQuotesVersion] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const quotesRef = useRef<Map<string, OptionTicker>>(new Map());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const manuallyClosedRef = useRef(false);
  const unmountedRef = useRef(false);
  const scheduleReconnectRef = useRef<() => void>(() => {});
  const animationFrameRef = useRef<number | null>(null);

  const fetchOptionChain = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/bybit/option-chain?baseCoin=${baseCoin}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || `Option chain request failed with ${response.status}`);
      }

      const data = (await response.json()) as OptionChainProxyResponse;
      const availableExpiries = Array.from(
        new Set(data.instruments.map((inst) => String(inst.deliveryTime)).filter(Boolean))
      ).sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));

      setUnderlyingPrice(data.underlyingPrice);
      setInstruments(data.instruments);
      setExpiryTimes(availableExpiries);
      setConnected(true);
      setLastUpdate(new Date());

      if (!selectedExpiry && availableExpiries.length > 0) {
        onExpiryChange?.(availableExpiries[0]);
      }

      if (data.underlyingPrice > 0) {
        onUnderlyingChange?.(data.underlyingPrice);
      }
    } catch (fetchError: unknown) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch option chain');
      setConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [baseCoin, onExpiryChange, onUnderlyingChange, selectedExpiry]);

  const clearReconnectTimer = React.useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const closeSocket = React.useCallback((manualClose: boolean) => {
    manuallyClosedRef.current = manualClose;
    clearReconnectTimer();

    const socket = wsRef.current;
    wsRef.current = null;

    if (!socket) {
      return;
    }

    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;

    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  }, [clearReconnectTimer]);

  const flushQuoteUpdates = React.useCallback(() => {
    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      setQuotesVersion((current) => current + 1);
      setLastUpdate(new Date());
    });
  }, []);

  const openSocket = React.useCallback(() => {
    if (manuallyClosedRef.current || unmountedRef.current) {
      return;
    }

    const current = wsRef.current;
    if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const socket = new WebSocket(OPTION_CHAIN_WS_URL);
    wsRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setWsConnected(true);
      setError(null);
      socket.send(JSON.stringify({ op: 'subscribe', args: ['tickers.BTC', 'tickers.ETH'] }));
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          topic?: string;
          data?: Array<Record<string, string>> | Record<string, string>;
        };

        if (!payload.topic?.startsWith('tickers.') || !payload.data) {
          return;
        }

        const tickers = Array.isArray(payload.data) ? payload.data : [payload.data];
        for (const ticker of tickers) {
          if (!ticker.symbol) {
            continue;
          }

          quotesRef.current.set(ticker.symbol, {
            symbol: ticker.symbol,
            bidPrice: ticker.bid1Price || '0',
            askPrice: ticker.ask1Price || '0',
            lastPrice: ticker.lastPrice || '0',
            markPrice: ticker.markPrice || '0',
            markIv: ticker.markIv || '0',
            underlyingPrice: ticker.underlyingPrice || '0',
            deliveryTime: ticker.deliveryTime || '0',
            totalVolume: ticker.volume24h || '0',
            baseCoin: ticker.baseCoin || 'BTC',
          });
        }

        flushQuoteUpdates();
      } catch (parseError) {
        console.error('[OptionChain] Failed to parse WS message:', parseError);
      }
    };

    socket.onerror = () => {
      setWsConnected(false);
    };

    socket.onclose = () => {
      if (wsRef.current === socket) {
        wsRef.current = null;
      }
      setWsConnected(false);

      if (!manuallyClosedRef.current && !unmountedRef.current) {
        scheduleReconnectRef.current();
      }
    };
  }, [flushQuoteUpdates]);

  const scheduleReconnect = React.useCallback(() => {
    if (manuallyClosedRef.current || unmountedRef.current || reconnectTimerRef.current) {
      return;
    }

    if (reconnectAttemptsRef.current >= OPTION_CHAIN_MAX_RECONNECTS) {
      setError((current) => current ?? 'Option chain WebSocket unavailable');
      return;
    }

    const attempt = reconnectAttemptsRef.current + 1;
    reconnectAttemptsRef.current = attempt;
    const delay = Math.min(OPTION_CHAIN_BASE_RECONNECT_MS * 2 ** (attempt - 1), 15000);

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      manuallyClosedRef.current = false;
      openSocket();
    }, delay);
  }, [openSocket]);

  scheduleReconnectRef.current = scheduleReconnect;

  useEffect(() => {
    unmountedRef.current = false;
    manuallyClosedRef.current = false;
    openSocket();

    return () => {
      unmountedRef.current = true;
      closeSocket(true);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [closeSocket, openSocket]);

  useEffect(() => {
    void fetchOptionChain();

    const interval = setInterval(() => {
      void fetchOptionChain();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchOptionChain]);

  const rows = useMemo(() => {
    void quotesVersion;

    const strikeMap = new Map<number, OptionRow>();
    const fallbackExpiry = selectedExpiry || expiryTimes[0];

    for (const instrument of instruments) {
      const deliveryTime = String(instrument.deliveryTime);
      if (fallbackExpiry && deliveryTime !== fallbackExpiry) {
        continue;
      }

      const strike = getStrikeFromSymbol(instrument.symbol);
      if (!strike) {
        continue;
      }

      const cached = quotesRef.current.get(instrument.symbol);
      const option: OptionTicker = {
        symbol: instrument.symbol,
        bidPrice: cached?.bidPrice || instrument.bid1Price || '0',
        askPrice: cached?.askPrice || instrument.ask1Price || '0',
        lastPrice: cached?.lastPrice || instrument.lastPrice || '0',
        markPrice: cached?.markPrice || instrument.markPrice || '0',
        markIv: cached?.markIv || instrument.markIv || '0',
        underlyingPrice: cached?.underlyingPrice || String(underlyingPrice),
        deliveryTime,
        totalVolume: cached?.totalVolume || instrument.volume24h || '0',
        baseCoin: instrument.baseCoin,
      };

      const existingRow = strikeMap.get(strike) || { strike };
      if (instrument.optionsType === 'Call') {
        existingRow.call = option;
      } else {
        existingRow.put = option;
      }
      strikeMap.set(strike, existingRow);
    }

    return Array.from(strikeMap.values()).sort((a, b) => a.strike - b.strike);
  }, [expiryTimes, instruments, quotesVersion, selectedExpiry, underlyingPrice]);

  if (isLoading && instruments.length === 0) {
    return (
      <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-5">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mr-3" />
          <span className="text-zinc-400 text-sm">Loading option chain...</span>
        </div>
      </div>
    );
  }

  if (error && instruments.length === 0) {
    return (
      <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-5">
        <div className="flex items-center justify-center py-12 text-red-500">
          <WifiOff className="w-8 h-8 mr-3" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Table className="w-5 h-5 text-purple-500" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest italic">Live Option Chain</h3>
          <div className="flex items-center gap-2">
            {wsConnected && (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="uppercase tracking-wider">WS Live</span>
              </span>
            )}
            {connected && !wsConnected && (
              <span className="flex items-center gap-1 text-xs text-yellow-500">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                <span className="uppercase tracking-wider">REST Only</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-1 bg-[#0a0a0a] border border-[#2a2e39] rounded-lg p-1">
            <button
              onClick={() => setBaseCoin('BTC')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                baseCoin === 'BTC' ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Bitcoin className="w-3 h-3" />
              BTC
            </button>
            <button
              onClick={() => setBaseCoin('ETH')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                baseCoin === 'ETH' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span className="text-[10px]">◆</span>
              ETH
            </button>
          </div>

          {lastUpdate && (
            <span className="text-xs text-zinc-500 font-mono">{lastUpdate.toLocaleTimeString()}</span>
          )}

          <button
            onClick={() => void fetchOptionChain()}
            disabled={isLoading}
            className="p-2 bg-[#0a0a0a] border border-[#2a2e39] rounded-lg hover:border-blue-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
        <span className="text-xs text-zinc-500 font-bold uppercase whitespace-nowrap">Expiry:</span>
        <div className="flex gap-2">
          {expiryTimes
            .filter((expiry) => expiry && expiry !== '0' && !Number.isNaN(Number.parseInt(expiry, 10)))
            .map((expiry) => (
              <button
                key={expiry}
                onClick={() => onExpiryChange?.(expiry)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedExpiry === expiry
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#0a0a0a] border border-[#2a2e39] text-zinc-400 hover:border-blue-500'
                }`}
              >
                {formatExpiry(expiry)}
                <span className="ml-1 text-zinc-500">({formatTimeToExpiry(expiry)})</span>
              </button>
            ))}
        </div>
      </div>

      <div className="mb-4 p-3 bg-[#0a0a0a] border border-[#2a2e39] rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          {baseCoin === 'BTC' ? (
            <Bitcoin className="w-4 h-4 text-orange-500" />
          ) : (
            <span className="text-blue-500 text-xs">◆</span>
          )}
          <span className="text-xs text-zinc-500 uppercase font-bold">{baseCoin} Spot Price</span>
        </div>
        <span className="text-lg font-black text-white italic">${underlyingPrice.toFixed(2)}</span>
      </div>

      {isLoading && instruments.length > 0 && (
        <div className="mb-4 flex items-center justify-center py-4 text-zinc-400 text-sm">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          Updating prices...
        </div>
      )}

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#0a0a0a] border-b border-[#2a2e39]">
              <tr>
                <th className="text-left py-3 px-3 text-zinc-500 font-bold uppercase">Strike</th>
                <th colSpan={4} className="text-center py-3 px-3 text-blue-500 font-bold uppercase border-l border-r border-[#2a2e39]">
                  Calls
                </th>
                <th className="text-center py-3 px-3 text-zinc-500 font-bold uppercase">IV</th>
                <th colSpan={4} className="text-center py-3 px-3 text-orange-500 font-bold uppercase border-l border-r border-[#2a2e39]">
                  Puts
                </th>
              </tr>
              <tr className="border-b border-[#2a2e39]">
                <th className="text-left py-2 px-3 text-zinc-500 font-mono"></th>
                <th className="text-right py-2 px-2 text-zinc-500 font-mono text-[10px]">Bid</th>
                <th className="text-right py-2 px-2 text-zinc-500 font-mono text-[10px]">Ask</th>
                <th className="text-right py-2 px-2 text-zinc-500 font-mono text-[10px]">Last</th>
                <th className="text-right py-2 px-2 text-zinc-500 font-mono text-[10px]">Vol</th>
                <th className="text-center py-2 px-3 text-zinc-500 font-mono"></th>
                <th className="text-right py-2 px-2 text-zinc-500 font-mono text-[10px]">Bid</th>
                <th className="text-right py-2 px-2 text-zinc-500 font-mono text-[10px]">Ask</th>
                <th className="text-right py-2 px-2 text-zinc-500 font-mono text-[10px]">Last</th>
                <th className="text-right py-2 px-2 text-zinc-500 font-mono text-[10px]">Vol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2e39]">
              {rows.map((row) => {
                const isITMCall = row.strike < underlyingPrice;

                return (
                  <tr key={row.strike} className="hover:bg-[#1a1e2a] transition-colors">
                    <td className="py-3 px-3">
                      <span className={`font-bold font-mono ${isITMCall ? 'text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded' : 'text-white'}`}>
                        {row.strike}
                      </span>
                    </td>

                    {row.call ? (
                      <>
                        <td className="py-2 px-2 text-right text-green-400 font-mono">{formatPrice(row.call.bidPrice)}</td>
                        <td className="py-2 px-2 text-right text-red-400 font-mono">{formatPrice(row.call.askPrice)}</td>
                        <td className="py-2 px-2 text-right text-white font-mono">{formatPrice(row.call.lastPrice)}</td>
                        <td className="py-2 px-2 text-right text-zinc-400 font-mono text-[10px]">
                          {Number.parseInt(row.call.totalVolume, 10).toLocaleString()}
                        </td>
                      </>
                    ) : (
                      <><td className="py-2 px-2"></td><td className="py-2 px-2"></td><td className="py-2 px-2"></td><td className="py-2 px-2"></td></>
                    )}

                    <td className="py-2 px-3 text-center text-purple-400 font-mono text-[10px]">
                      {row.call ? formatIV(row.call.markIv) : row.put ? formatIV(row.put.markIv) : '-'}
                    </td>

                    {row.put ? (
                      <>
                        <td className="py-2 px-2 text-right text-green-400 font-mono">{formatPrice(row.put.bidPrice)}</td>
                        <td className="py-2 px-2 text-right text-red-400 font-mono">{formatPrice(row.put.askPrice)}</td>
                        <td className="py-2 px-2 text-right text-white font-mono">{formatPrice(row.put.lastPrice)}</td>
                        <td className="py-2 px-2 text-right text-zinc-400 font-mono text-[10px]">
                          {Number.parseInt(row.put.totalVolume, 10).toLocaleString()}
                        </td>
                      </>
                    ) : (
                      <><td className="py-2 px-2"></td><td className="py-2 px-2"></td><td className="py-2 px-2"></td><td className="py-2 px-2"></td></>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center justify-center py-12 text-zinc-500">
          <Table className="w-8 h-8 mr-3 opacity-50" />
          <span className="text-sm">
            {baseCoin === 'ETH' ? 'ETH options not available on Bybit. Switch to BTC.' : 'No options found for selected expiry'}
          </span>
        </div>
      )}
    </div>
  );
}
