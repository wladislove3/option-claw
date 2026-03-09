CREATE TABLE IF NOT EXISTS virtual_positions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(128),
    underlying VARCHAR(32) NOT NULL,
    direction VARCHAR(16) NOT NULL,
    total_quantity INTEGER NOT NULL,
    total_entry_price DECIMAL(20,8) NOT NULL,
    legs JSONB NOT NULL,
    greeks_delta DECIMAL(20,8),
    greeks_gamma DECIMAL(20,8),
    greeks_theta DECIMAL(20,8),
    greeks_vega DECIMAL(20,8),
    unrealized_pnl DECIMAL(20,8),
    realized_pnl DECIMAL(20,8),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_virtual_positions_user_id ON virtual_positions(user_id);
CREATE INDEX idx_virtual_positions_deleted ON virtual_positions(deleted_at);
