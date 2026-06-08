-- Trading Cash refinement: SGD cash is manual-only for calculations; USD cash is reference-only.

ALTER TABLE public.portfolio_overrides
  ADD COLUMN IF NOT EXISTS manual_trading_cash_usd NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS manual_trading_cash_sgd NUMERIC(14, 2);

COMMENT ON COLUMN public.portfolio_overrides.manual_trading_cash_usd IS
  'Manual broker USD cash — reference for US stocks/options only; never added to Trading Cash SGD.';
COMMENT ON COLUMN public.portfolio_overrides.manual_trading_cash_sgd IS
  'Manual broker SGD cash — sole input for trading_cash_sgd and trading capital calculations.';

UPDATE public.portfolio_overrides
SET manual_trading_cash_sgd = manual_cash_value_sgd
WHERE manual_trading_cash_sgd IS NULL
  AND manual_cash_value_sgd IS NOT NULL;

COMMENT ON COLUMN public.daily_portfolio_snapshots.usd_cash IS
  'Manual Trading Cash USD — broker USD cash, reference only.';
COMMENT ON COLUMN public.daily_portfolio_snapshots.sgd_cash IS
  'Manual Trading Cash SGD — used for trading_cash_sgd and trading capital (not FX-derived).';
COMMENT ON COLUMN public.daily_portfolio_snapshots.usd_cash_sgd_equivalent IS
  'Deprecated — no longer used in trading_cash_sgd. Kept for legacy rows; write 0.';

ALTER TABLE public.daily_portfolio_snapshots
  DROP COLUMN IF EXISTS trading_cash_sgd;

ALTER TABLE public.daily_portfolio_snapshots
  ADD COLUMN trading_cash_sgd NUMERIC(14, 2)
  GENERATED ALWAYS AS (sgd_cash) STORED;

ALTER TABLE public.daily_portfolio_snapshots
  DROP COLUMN IF EXISTS trading_capital_sgd;

ALTER TABLE public.daily_portfolio_snapshots
  ADD COLUMN trading_capital_sgd NUMERIC(14, 2)
  GENERATED ALWAYS AS (
    us_etf_value_sgd
    + us_stock_value_sgd
    + sg_stock_value_sgd
    + sgd_cash
    + current_options_value_sgd
  ) STORED;

COMMENT ON COLUMN public.daily_portfolio_snapshots.trading_cash_sgd IS
  'Derived: sgd_cash only (manual Trading Cash SGD). Excludes USD cash and crypto_cash_sgd.';
COMMENT ON COLUMN public.daily_portfolio_snapshots.trading_capital_sgd IS
  'Derived: US ETF + US Stock + SG Stock + sgd_cash + options. Excludes USD cash, crypto, client capital.';
