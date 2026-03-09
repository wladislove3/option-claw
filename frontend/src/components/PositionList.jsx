import { useState, useMemo } from 'react';
import './PositionList.css';

const Icons = {
  SortAsc: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
  ),
  SortDesc: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 12-7 7-7-7"/><path d="M12 5v14"/></svg>
  ),
  SortNone: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 9-3-3-3 3"/><path d="m9 15 3 3 3-3"/></svg>
  ),
  Empty: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
  ),
  Filter: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
  )
};

function PositionList({ positions = [], loading, error, showGreeks = false }) {
  const [sortConfig, setSortConfig] = useState({ key: 'symbol', direction: 'asc' });
  const [filter, setFilter] = useState('all');

  // Handle sorting
  const sortedPositions = useMemo(() => {
    if (!positions || positions.length === 0) return [];
    let sortable = [...positions];
    if (sortConfig.key !== null) {
      sortable.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        // Parse numeric values if they are strings
        if (typeof aVal === 'string' && !isNaN(parseFloat(aVal))) {
          aVal = parseFloat(aVal);
          bVal = parseFloat(bVal);
        }
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [positions, sortConfig]);

  // Handle filtering
  const filteredPositions = useMemo(() => {
    if (filter === 'all') return sortedPositions;
    return sortedPositions.filter(p => {
      const type = (p.type || p.side || '').toLowerCase();
      if (filter === 'call') return type.includes('call');
      if (filter === 'put') return type.includes('put');
      return true;
    });
  }, [sortedPositions, filter]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnName }) => {
    if (sortConfig.key !== columnName) return <Icons.SortNone />;
    return sortConfig.direction === 'asc' ? <Icons.SortAsc /> : <Icons.SortDesc />;
  };

  if (loading) {
    return (
      <div className="position-list-loading">
        <div className="spinner-ring"></div>
        <p>Updating Market Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="position-list-error">
        <div className="error-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        </div>
        <h3>Failed to load positions</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="position-list-empty">
        <Icons.Empty />
        <h3>No Positions Found</h3>
        <p>Your portfolio is currently empty. Create a new position to get started.</p>
      </div>
    );
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseFloat(val || 0));
  };

  const formatNumber = (val, digits = 4) => {
    return parseFloat(val || 0).toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  };

  return (
    <div className="position-list card">
      <div className="list-header">
        <div className="filter-group">
          <Icons.Filter />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
            <option value="all">All Positions</option>
            <option value="call">Calls Only</option>
            <option value="put">Puts Only</option>
          </select>
        </div>
        <div className="count-summary">
          Showing <strong>{filteredPositions.length}</strong> of <strong>{positions.length}</strong> positions
        </div>
      </div>
      
      <div className="table-container">
        <table className="position-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('symbol')} className="sortable">
                Symbol <SortIcon columnName="symbol" />
              </th>
              <th onClick={() => requestSort('type')} className="sortable">
                Type <SortIcon columnName="type" />
              </th>
              <th onClick={() => requestSort('strike')} className="sortable text-right">
                Strike <SortIcon columnName="strike" />
              </th>
              <th onClick={() => requestSort('size')} className="sortable text-right">
                Qty <SortIcon columnName="size" />
              </th>
              <th onClick={() => requestSort('entryPrice')} className="sortable text-right">
                Entry <SortIcon columnName="entryPrice" />
              </th>
              <th onClick={() => requestSort('markPrice')} className="sortable text-right">
                Mark <SortIcon columnName="markPrice" />
              </th>
              <th onClick={() => requestSort('unrealisedPnl')} className="sortable text-right">
                P&L <SortIcon columnName="unrealisedPnl" />
              </th>
              {showGreeks && (
                <>
                  <th onClick={() => requestSort('delta')} className="sortable text-right">
                    Delta <SortIcon columnName="delta" />
                  </th>
                  <th onClick={() => requestSort('gamma')} className="sortable text-right">
                    Gamma <SortIcon columnName="gamma" />
                  </th>
                  <th onClick={() => requestSort('theta')} className="sortable text-right">
                    Theta <SortIcon columnName="theta" />
                  </th>
                  <th onClick={() => requestSort('vega')} className="sortable text-right">
                    Vega <SortIcon columnName="vega" />
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredPositions.map((position, index) => {
              const type = (position.type || position.side || '').toLowerCase();
              const isCall = type.includes('call');
              const isPut = type.includes('put');
              const pnl = parseFloat(position.unrealisedPnl || 0);

              return (
                <tr key={position.id || index}>
                  <td className="font-bold">{position.symbol}</td>
                  <td>
                    <span className={`type-badge ${isCall ? 'call' : isPut ? 'put' : ''}`}>
                      {position.type || position.side || 'Other'}
                    </span>
                  </td>
                  <td className="text-right">{formatCurrency(position.strike)}</td>
                  <td className="text-right">{position.size || position.quantity || 0}</td>
                  <td className="text-right">{formatCurrency(position.entryPrice)}</td>
                  <td className="text-right">{formatCurrency(position.markPrice)}</td>
                  <td className={`text-right pnl-cell ${pnl >= 0 ? 'positive' : 'negative'}`}>
                    <span className="pnl-value">
                      {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                    </span>
                  </td>
                  {showGreeks && (
                    <>
                      <td className="text-right">{formatNumber(position.delta)}</td>
                      <td className="text-right">{formatNumber(position.gamma)}</td>
                      <td className="text-right">{formatNumber(position.theta)}</td>
                      <td className="text-right">{formatNumber(position.vega)}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PositionList;
