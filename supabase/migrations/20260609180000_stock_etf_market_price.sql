-- Stock & ETF holdings: auto market price fields for scheduled refresh

ALTER TABLE public.stock_etf_holdings
  ADD COLUMN IF NOT EXISTS last_market_price_native NUMERIC(14, 4),
  ADD COLUMN IF NOT EXISTS last_price_date DATE,
  ADD COLUMN IF NOT EXISTS price_source TEXT,
  ADD COLUMN IF NOT EXISTS manual_value_override BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.stock_etf_holdings.last_market_price_native IS
  'Latest completed daily close used for Current Value = shares × price.';

COMMENT ON COLUMN public.stock_etf_holdings.manual_value_override IS
  'When true, current_value_native is manual and not overwritten by price sync.';
