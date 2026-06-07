-- Separate client capital tracking on daily portfolio snapshots
ALTER TABLE daily_portfolio_snapshots
  ADD COLUMN IF NOT EXISTS client_initial_capital_sgd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_current_value_sgd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_assets_managed_sgd numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN daily_portfolio_snapshots.portfolio_value_sgd IS 'My Portfolio Value only — excludes client capital';
COMMENT ON COLUMN daily_portfolio_snapshots.client_initial_capital_sgd IS 'Sum of client capital contributed';
COMMENT ON COLUMN daily_portfolio_snapshots.client_current_value_sgd IS 'Client initial capital + client P/L';
COMMENT ON COLUMN daily_portfolio_snapshots.total_assets_managed_sgd IS 'My portfolio + client current value (informational)';
