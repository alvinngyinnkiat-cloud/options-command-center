-- Hybrid manual position + transaction accounting modes for Stock & ETF Tracker

ALTER TABLE public.stock_etf_holdings
  ADD COLUMN IF NOT EXISTS tracking_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (tracking_mode IN ('manual', 'transaction')),
  ADD COLUMN IF NOT EXISTS manual_total_dividend NUMERIC(14, 2) NOT NULL DEFAULT 0
    CHECK (manual_total_dividend >= 0),
  ADD COLUMN IF NOT EXISTS manual_total_fees NUMERIC(14, 2) NOT NULL DEFAULT 0
    CHECK (manual_total_fees >= 0);

COMMENT ON COLUMN public.stock_etf_holdings.tracking_mode IS
  'manual = historical backfill snapshot; transaction = buy/sell/dividend accounting.';

ALTER TABLE public.portfolio_overrides
  ADD COLUMN IF NOT EXISTS stock_etf_tracking_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (stock_etf_tracking_mode IN ('manual', 'transaction'));

COMMENT ON COLUMN public.portfolio_overrides.stock_etf_tracking_mode IS
  'Default Stock & ETF tracker mode for new positions and UI emphasis.';

ALTER TABLE public.stock_etf_transactions
  DROP CONSTRAINT IF EXISTS stock_etf_transactions_transaction_type_check;

ALTER TABLE public.stock_etf_transactions
  ADD CONSTRAINT stock_etf_transactions_transaction_type_check
  CHECK (transaction_type IN ('buy', 'sell', 'opening_balance', 'dividend'));

ALTER TABLE public.stock_etf_transactions
  DROP CONSTRAINT IF EXISTS stock_etf_transactions_shares_check;

ALTER TABLE public.stock_etf_transactions
  ADD CONSTRAINT stock_etf_transactions_shares_check
  CHECK (shares >= 0);
