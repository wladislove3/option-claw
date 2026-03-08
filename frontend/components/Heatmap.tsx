'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useBuilderStore } from '@/store/builderStore';
import { MousePointer2, Thermometer } from 'lucide-react';

export default function Heatmap() {
  const { matrixData: data, isLoading } = useBuilderStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    price: number;
    days: number;
    pnl: number;
  } | null>(null);

  useEffect(() => {
    if (!data || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const { price_axis, time_axis, pnl_matrix, max_profit, max_loss } = data;
    
    const priceSteps = price_axis.length;
    const timeSteps = time_axis.length;

    // Create color scale (Symmetric around 0)
    const maxAbs = Math.max(Math.abs(max_profit), Math.abs(max_loss), 1);
    const colorScale = d3
      .scaleSequential(d3.interpolateRdYlGn)
      .domain([-maxAbs, maxAbs]);

    // Create scales for axes
    const xScale = d3.scaleLinear()
      .domain([price_axis[0], price_axis[price_axis.length - 1]])
      .range([0, width]);

    const cellWidth = width / priceSteps;
    const cellHeight = height / timeSteps;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw heatmap cells
    for (let t = 0; t < timeSteps; t++) {
      for (let p = 0; p < priceSteps; p++) {
        const pnl = pnl_matrix[t][p];
        const x = p * cellWidth;
        // Invert Y axis: higher time index (t) is at the top (DTE descending)
        const y = (timeSteps - 1 - t) * cellHeight;

        ctx.fillStyle = colorScale(pnl);
        ctx.fillRect(x, y, cellWidth + 0.5, cellHeight + 0.5);
      }
    }

    // Draw zero line (breakeven)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let t = 0; t < timeSteps; t++) {
      for (let p = 0; p < priceSteps - 1; p++) {
        const pnl1 = pnl_matrix[t][p];
        const pnl2 = pnl_matrix[t][p + 1];
        if (pnl1 * pnl2 < 0) {
          const ratio = Math.abs(pnl1) / (Math.abs(pnl1) + Math.abs(pnl2));
          const x = (p + ratio) * cellWidth;
          const y = (timeSteps - 1 - t) * cellHeight;
          if (p === 0 || pnl_matrix[t][p - 1] * pnl1 >= 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
    }
    ctx.stroke();

    // Draw current spot price line
    const currentPrice = data.price_axis[0] / 0.7; // Reversing the 0.7 range from matrix.go
    const spotX = xScale(currentPrice);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(spotX, 0);
    ctx.lineTo(spotX, height);
    ctx.stroke();
    ctx.setLineDash([]);

  }, [data, isLoading]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!data || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const { price_axis, time_axis, pnl_matrix } = data;
    const priceSteps = price_axis.length;
    const timeSteps = time_axis.length;
    const width = rect.width;
    const height = rect.height;

    const cellWidth = width / priceSteps;
    const cellHeight = height / timeSteps;

    const p = Math.floor(x / cellWidth);
    const t = timeSteps - 1 - Math.floor(y / cellHeight);

    if (p >= 0 && p < priceSteps && t >= 0 && t < timeSteps) {
      setTooltip({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        price: price_axis[p],
        days: time_axis[t],
        pnl: pnl_matrix[t][p],
      });
    } else {
      setTooltip(null);
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a] border border-[#2a2e39] rounded-xl">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
        <div className="text-zinc-500 font-mono text-sm uppercase tracking-widest">Calculating Engine...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a] border border-[#2a2e39] rounded-xl p-8 text-center">
        <Thermometer className="w-12 h-12 text-[#2a2e39] mb-4" />
        <div className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
          Add option legs and click calculate to generate P&L matrix
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0 relative flex">
         {/* Y Axis Labels (Time/Days) */}
         <div className="w-12 flex flex-col justify-between py-1 text-[10px] text-zinc-500 font-mono pr-2 text-right shrink-0">
          {[...data.time_axis].reverse().map((d, i) => i % 10 === 0 ? <span key={i}>{Math.round(d)}d</span> : <span key={i} className="opacity-0">.</span>)}
        </div>

        <div ref={containerRef} className="flex-1 relative bg-[#0a0a0a] border border-[#2a2e39] rounded-lg overflow-hidden group">
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="w-full h-full cursor-crosshair"
          />
          
          {tooltip && tooltip.visible && (
            <div
              className="fixed bg-[#131722] border border-[#2a2e39] rounded-lg p-3 text-[11px] pointer-events-none z-50 shadow-2xl backdrop-blur-md"
              style={{
                left: tooltip.x + 15,
                top: tooltip.y + 15,
              }}
            >
              <div className="flex items-center gap-2 mb-2 border-b border-[#2a2e39] pb-1">
                <MousePointer2 className="w-3 h-3 text-blue-500" />
                <span className="text-white font-bold uppercase tracking-wider font-mono">Position Data</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono">
                <span className="text-zinc-500">Price:</span>
                <span className="text-zinc-300 text-right font-bold">${tooltip.price.toFixed(2)}</span>
                <span className="text-zinc-500">Days:</span>
                <span className="text-zinc-300 text-right font-bold">{tooltip.days.toFixed(1)}d</span>
                <span className="text-zinc-500 border-t border-[#2a2e39] pt-1 mt-1">P&L:</span>
                <span className={`text-right font-bold border-t border-[#2a2e39] pt-1 mt-1 ${tooltip.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${tooltip.pnl.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* X Axis Labels (Price) */}
      <div className="h-6 flex justify-between pl-12 text-[10px] text-zinc-500 font-mono mt-1 pr-2 shrink-0">
        {data.price_axis.map((p, i) => i % 20 === 0 ? <span key={i}>${Math.round(p)}</span> : null)}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 p-2 bg-[#131722] border border-[#2a2e39] rounded-lg shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-red-500 uppercase tracking-widest font-bold">Max Loss: -${Math.abs(data.max_loss).toFixed(0)}</span>
          <div className="w-32 h-2 rounded-full overflow-hidden flex border border-black/20 shadow-inner">
            <div className="flex-1 h-full bg-gradient-to-r from-red-600 via-yellow-400 to-green-600" />
          </div>
          <span className="text-[10px] text-green-500 uppercase tracking-widest font-bold">Max Profit: +${Math.abs(data.max_profit).toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}
