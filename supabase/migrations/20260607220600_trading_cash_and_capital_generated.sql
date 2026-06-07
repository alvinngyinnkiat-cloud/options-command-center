-- Database Correction #3A: explicit trading cash and trading capital (generated)

-- Stored inputs for trading cash (no FX — USD bucket is broker-reported SGD equivalent)
ALTER TABLE public.daily_portfolio_snapshots
  ADD COLUMN IF NOT EXISTS usd_cash_sgd_equivalent NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS us_etf_value_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS us_stock_value_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sg_stock_value_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_options_value_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.daily_portfolio_snapshots.usd_cash IS
  'Legacy: broker USD cash native amount (display only). Trading cash uses usd_cash_sgd_equivalent.';
COMMENT ON COLUMN public.daily_portfolio_snapshots.usd_cash_sgd_equivalent IS
  'Broker USD cash bucket — manually entered SGD equivalent (not FX-derived).';
COMMENT ON COLUMN public.daily_portfolio_snapshots.sgd_cash IS
  'Broker SGD cash — part of trading cash only.';
COMMENT ON COLUMN public.daily_portfolio_snapshots.crypto_cash_sgd IS
  'Crypto exchange cash / stablecoins — excluded from trading_cash_sgd and trading_capital_sgd.';

-- Replace writable trading_capital_sgd from 16C with generated definition
ALTER TABLE public.daily_portfolio_snapshots
  DROP COLUMN IF EXISTS trading_capital_sgd;

ALTER TABLE public.daily_portfolio_snapshots
  DROP COLUMN IF EXISTS trading_cash_sgd;

ALTER TABLE public.daily_portfolio_snapshots
  ADD COLUMN trading_cash_sgd NUMERIC(14, 2)
  GENERATED ALWAYS AS (
    usd_cash_sgd_equivalent + sgd_cash
  ) STORED;

ALTER TABLE public.daily_portfolio_snapshots
  ADD COLUMN trading_capital_sgd NUMERIC(14, 2)
  GENERATED ALWAYS AS (
    us_etf_value_sgd
    + us_stock_value_sgd
    + sg_stock_value_sgd
    + (usd_cash_sgd_equivalent + sgd_cash)
    + current_options_value_sgd
  ) STORED;

COMMENT ON COLUMN public.daily_portfolio_snapshots.trading_cash_sgd IS
  'Derived: usd_cash_sgd_equivalent + sgd_cash. Excludes crypto_cash_sgd.';
COMMENT ON COLUMN public.daily_portfolio_snapshots.trading_capital_sgd IS
  'Derived: US ETF + US Stock + SG Stock + trading_cash + options. Excludes crypto holdings, crypto cash, and client capital.';
