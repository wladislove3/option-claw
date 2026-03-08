import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { useBuilderStore } from '../store/builderStore';
import { calculatePrice } from '../math/blackScholes';

export const PayoffChart: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { legs, spotPrice, targetDaysToExpiry } = useBuilderStore();

  const data = useMemo(() => {
    // Generate data points for X axis (underlying price)
    // Range: +/- 30% of current spot
    const minSpot = spotPrice * 0.7;
    const maxSpot = spotPrice * 1.3;
    const steps = 100;
    const stepSize = (maxSpot - minSpot) / steps;

    const points = [];
    for (let i = 0; i <= steps; i++) {
      const S = minSpot + i * stepSize;
      
      let expiryPnl = 0;
      let currentPnl = 0;

      legs.forEach(leg => {
        const r = 0.05; // risk free rate
        
        // PnL at expiry
        const expiryPrice = calculatePrice(leg.type, S, leg.strike, 0, r, leg.iv);
        // PnL at T+0 (or target DTE)
        const currentPrice = calculatePrice(leg.type, S, leg.strike, targetDaysToExpiry / 365, r, leg.iv);

        const entry = leg.entryPrice || 0;
        const multiplier = leg.side === 'Long' ? leg.size : -leg.size;

        expiryPnl += (expiryPrice - entry) * multiplier;
        currentPnl += (currentPrice - entry) * multiplier;
      });

      points.push({ spot: S, expiryPnl, currentPnl });
    }
    return points;
  }, [legs, spotPrice, targetDaysToExpiry]);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    let resizeObserver: ResizeObserver;

    const drawChart = () => {
      if (!containerRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      if (width === 0 || height === 0) return;

      const margin = { top: 20, right: 30, bottom: 30, left: 50 };

    d3.select(containerRef.current).selectAll('*').remove();

    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    const x = d3.scaleLinear()
      .domain([d3.min(data, d => d.spot) as number, d3.max(data, d => d.spot) as number])
      .range([margin.left, width - margin.right]);

    const maxAbsPnl = d3.max(data, d => Math.max(Math.abs(d.expiryPnl), Math.abs(d.currentPnl))) || 100;
    
    const y = d3.scaleLinear()
      .domain([-maxAbsPnl * 1.1, maxAbsPnl * 1.1])
      .range([height - margin.bottom, margin.top]);

    // Zero Line
    svg.append('line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', y(0))
      .attr('y2', y(0))
      .attr('stroke', '#2a2e39')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,4');

    // Axes
    const xAxis = d3.axisBottom(x).ticks(6).tickFormat(d => `$${d as number}`);
    const yAxis = d3.axisLeft(y).ticks(6).tickFormat(d => `$${d as number}`);

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(xAxis)
      .attr('color', '#6b7280')
      .selectAll('text').attr('fill', '#9ca3af').style('font-family', 'monospace');

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(yAxis)
      .attr('color', '#6b7280')
      .selectAll('text').attr('fill', '#9ca3af').style('font-family', 'monospace');

    // Remove domains paths
    svg.selectAll('.domain').remove();

    // Line generators
    const expiryLine = d3.line<{spot: number, expiryPnl: number, currentPnl: number}>()
      .x(d => x(d.spot))
      .y(d => y(d.expiryPnl));

    const currentLine = d3.line<{spot: number, expiryPnl: number, currentPnl: number}>()
      .x(d => x(d.spot))
      .y(d => y(d.currentPnl))
      .curve(d3.curveMonotoneX);

    // Draw Expiry Line (Angular)
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#00c853')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.8)
      .attr('d', expiryLine);

    // Draw T+0 Current Line (Smooth)
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#a78bfa')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('d', currentLine);

    // Current Spot Indicator
    svg.append('line')
      .attr('x1', x(spotPrice))
      .attr('x2', x(spotPrice))
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4');
    };

    drawChart();

    resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(drawChart);
    });
    
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [data, spotPrice]);

  return <div ref={containerRef} className="absolute inset-0" />;
};
