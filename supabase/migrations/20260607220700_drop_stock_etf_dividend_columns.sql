-- Phase 16C.2 Issue #4: Remove deprecated dividend columns from stock_etf_holdings.
-- dividend_records is the single source of truth for dividend income.

ALTER TABLE public.stock_etf_holdings
  DROP COLUMN IF EXISTS dividend_yield,
  DROP COLUMN IF EXISTS annual_dividend_income;

COMMENT ON TABLE public.stock_etf_holdings IS
  'Stock and ETF position holdings. Dividend income is tracked in dividend_records only.';
