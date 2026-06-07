-- Database Correction #2A: total_assets_managed_sgd as GENERATED STORED column
-- Formula: portfolio_value_sgd + client_current_value_sgd (informational AUM only)

ALTER TABLE public.daily_portfolio_snapshots
  DROP COLUMN IF EXISTS total_assets_managed_sgd;

ALTER TABLE public.daily_portfolio_snapshots
  ADD COLUMN total_assets_managed_sgd NUMERIC(14, 2)
  GENERATED ALWAYS AS (
    portfolio_value_sgd + client_current_value_sgd
  ) STORED;

COMMENT ON COLUMN public.daily_portfolio_snapshots.total_assets_managed_sgd IS
  'Derived (read-only): portfolio_value_sgd + client_current_value_sgd. Informational AUM — not used for goals.';
