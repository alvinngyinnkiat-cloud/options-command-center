-- SG Stock dividend fields

ALTER TABLE public.stock_etf_holdings
  ADD COLUMN IF NOT EXISTS dividend_yield NUMERIC(7, 4),
  ADD COLUMN IF NOT EXISTS annual_dividend_income NUMERIC(12, 2);

COMMENT ON COLUMN public.stock_etf_holdings.dividend_yield IS
  'Annual dividend yield % — primarily for SG Stock holdings.';
COMMENT ON COLUMN public.stock_etf_holdings.annual_dividend_income IS
  'Estimated annual dividend income in native currency.';
