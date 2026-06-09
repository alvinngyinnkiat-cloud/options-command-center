-- Watchlist market data engine — average price + fetch timestamp

ALTER TABLE public.market_data
  ADD COLUMN IF NOT EXISTS average_price NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ;

COMMENT ON COLUMN public.market_data.average_price IS
  'Scanner price: (high + low) / 2. Scoring uses average_price, not close.';
COMMENT ON COLUMN public.market_data.fetched_at IS
  'Timestamp when OHLCV was last fetched from FMP or Yahoo.';
