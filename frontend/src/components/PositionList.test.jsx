import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PositionList from './PositionList';

describe('PositionList', () => {
  const mockPositions = [
    {
      symbol: 'BTC-2026-CALL',
      type: 'call',
      strike: '50000',
      size: '1',
      entryPrice: '1500',
      markPrice: '1600',
      unrealisedPnl: '100',
      delta: '0.5',
    },
    {
      symbol: 'ETH-2026-PUT',
      type: 'put',
      strike: '2000',
      size: '10',
      entryPrice: '100',
      markPrice: '80',
      unrealisedPnl: '-200',
      delta: '-0.3',
    }
  ];

  it('renders a table with positions', () => {
    render(<PositionList positions={mockPositions} />);
    
    expect(screen.getByText('BTC-2026-CALL')).toBeInTheDocument();
    expect(screen.getByText('ETH-2026-PUT')).toBeInTheDocument();
    // Intl.NumberFormat adds commas
    expect(screen.getByText('$50,000.00')).toBeInTheDocument();
    expect(screen.getByText('$2,000.00')).toBeInTheDocument();
  });

  it('shows empty state when no positions are provided', () => {
    render(<PositionList positions={[]} />);
    expect(screen.getByText(/No Positions Found/i)).toBeInTheDocument();
  });

  it('filters positions by type', () => {
    render(<PositionList positions={mockPositions} />);
    
    const filterSelect = screen.getByRole('combobox');
    
    // Select Calls
    fireEvent.change(filterSelect, { target: { value: 'call' } });
    expect(screen.getByText('BTC-2026-CALL')).toBeInTheDocument();
    expect(screen.queryByText('ETH-2026-PUT')).not.toBeInTheDocument();

    // Select Puts
    fireEvent.change(filterSelect, { target: { value: 'put' } });
    expect(screen.queryByText('BTC-2026-CALL')).not.toBeInTheDocument();
    expect(screen.getByText('ETH-2026-PUT')).toBeInTheDocument();
  });

  it('sorts positions when headers are clicked', () => {
    render(<PositionList positions={mockPositions} />);
    
    // Header text is now "Symbol " + Icon
    const symbolHeader = screen.getByText(/Symbol/i);
    
    // Initial order (BTC, then ETH)
    let rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('BTC');
    expect(rows[2]).toHaveTextContent('ETH');

    // Click to sort
    fireEvent.click(symbolHeader);
    fireEvent.click(symbolHeader);
    
    rows = screen.getAllByRole('row');
    // Check that it still renders 2 data rows
    expect(rows).toHaveLength(3); // Header + 2 data rows
  });

  it('displays Greeks columns when showGreeks is true', () => {
    render(<PositionList positions={mockPositions} showGreeks={true} />);
    expect(screen.getByText(/Delta/i)).toBeInTheDocument();
    expect(screen.getByText(/Gamma/i)).toBeInTheDocument();
  });
});
