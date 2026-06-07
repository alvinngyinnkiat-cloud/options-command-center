-- Phase 16C: Extend existing tables per approved schema (16B)

-- ---------------------------------------------------------------------------
-- daily_portfolio_snapshots — My Portfolio vs client capital separation
-- ---------------------------------------------------------------------------

ALTER TABLE public.daily_portfolio_snapshots
  ADD COLUMN IF NOT EXISTS crypto_cash_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trading_capital_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS entered_by public.snapshot_entry_source NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.daily_portfolio_snapshots.portfolio_value_sgd IS
  'My Portfolio Value only — excludes client capital. Used by Financial Goals and CAGR.';
COMMENT ON COLUMN public.daily_portfolio_snapshots.client_current_value_sgd IS
  'Client initial capital + client P/L — separate pool from My Portfolio Value.';
COMMENT ON COLUMN public.daily_portfolio_snapshots.total_assets_managed_sgd IS
  'Informational: portfolio_value_sgd + client_current_value_sgd. Not used for goals.';
COMMENT ON COLUMN public.daily_portfolio_snapshots.crypto_cash_sgd IS
  'Crypto Cash (stablecoins) — part of My Portfolio but excluded from Trading Capital.';
COMMENT ON COLUMN public.daily_portfolio_snapshots.trading_capital_sgd IS
  'Snapshot of trading capital (excludes crypto holdings and crypto cash). Options risk base.';
COMMENT ON COLUMN public.daily_portfolio_snapshots.is_manual_entry IS
  'When true, auto-snapshot jobs must not overwrite this row.';

CREATE TRIGGER set_daily_portfolio_snapshots_updated_at
  BEFORE UPDATE ON public.daily_portfolio_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- market_data — extended OHLCV and market cap fields
-- ---------------------------------------------------------------------------

ALTER TABLE public.market_data
  ADD COLUMN IF NOT EXISTS previous_close NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS market_cap_billions NUMERIC(16, 4),
  ADD COLUMN IF NOT EXISTS fifty_two_week_high NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS fifty_two_week_low NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS one_year_performance_pct NUMERIC(8, 4);

COMMENT ON COLUMN public.market_data.market_cap_billions IS
  'Market capitalization in USD billions from API refresh.';
COMMENT ON TABLE public.market_data IS
  'Cached OHLCV and quote fields per watchlist ticker. Does NOT generate support/resistance.';

-- ---------------------------------------------------------------------------
-- crypto_holdings — distinguish holdings vs crypto cash (stablecoins)
-- ---------------------------------------------------------------------------

ALTER TABLE public.crypto_holdings
  ADD COLUMN IF NOT EXISTS position_type public.crypto_position_type NOT NULL DEFAULT 'holding';

COMMENT ON COLUMN public.crypto_holdings.position_type IS
  'holding = crypto assets; cash = stablecoins/crypto cash excluded from options risk.';

CREATE INDEX IF NOT EXISTS idx_crypto_holdings_position_type
  ON public.crypto_holdings(user_id, position_type);

-- ---------------------------------------------------------------------------
-- stock_etf_holdings — market region (US / SG)
-- ---------------------------------------------------------------------------

ALTER TABLE public.stock_etf_holdings
  ADD COLUMN IF NOT EXISTS market public.stock_market;

UPDATE public.stock_etf_holdings
SET market = CASE
  WHEN currency = 'SGD' THEN 'SG'::public.stock_market
  ELSE 'US'::public.stock_market
END
WHERE market IS NULL;

ALTER TABLE public.stock_etf_holdings
  ALTER COLUMN market SET DEFAULT 'US';

COMMENT ON COLUMN public.stock_etf_holdings.dividend_yield IS
  'DEPRECATED — use dividend_records as single source of truth for dividend income.';
COMMENT ON COLUMN public.stock_etf_holdings.annual_dividend_income IS
  'DEPRECATED — use dividend_records as single source of truth for dividend income.';

-- ---------------------------------------------------------------------------
-- dividend_records — idempotent API sync
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_dividend_records_user_api_ref
  ON public.dividend_records(user_id, api_reference_id)
  WHERE api_reference_id IS NOT NULL;

COMMENT ON TABLE public.dividend_records IS
  'Single source of truth for dividend income. is_manual_override blocks API overwrite.';

-- ---------------------------------------------------------------------------
-- market_intelligence_ticker_impacts — fix watchlist_id as proper FK
-- ---------------------------------------------------------------------------

ALTER TABLE public.market_intelligence_ticker_impacts
  ADD COLUMN IF NOT EXISTS watchlist_id_fk UUID REFERENCES public.watchlist(id) ON DELETE SET NULL;

DO $$
BEGIN
  UPDATE public.market_intelligence_ticker_impacts mi
  SET watchlist_id_fk = mi.watchlist_id::uuid
  WHERE mi.watchlist_id IS NOT NULL
    AND mi.watchlist_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND mi.watchlist_id_fk IS NULL;
EXCEPTION WHEN invalid_text_representation THEN
  NULL;
END $$;

ALTER TABLE public.market_intelligence_ticker_impacts
  DROP COLUMN IF EXISTS watchlist_id;

ALTER TABLE public.market_intelligence_ticker_impacts
  RENAME COLUMN watchlist_id_fk TO watchlist_id;

CREATE INDEX IF NOT EXISTS idx_mi_ticker_impacts_watchlist_id
  ON public.market_intelligence_ticker_impacts(watchlist_id)
  WHERE watchlist_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- portfolio_overrides — manual reconciliation policy
-- ---------------------------------------------------------------------------

COMMENT ON TABLE public.portfolio_overrides IS
  'MANUAL ONLY — broker-reported values. Auto-refresh must never UPDATE this table.';

-- ---------------------------------------------------------------------------
-- support_resistance — manual only policy (reinforce)
-- ---------------------------------------------------------------------------

COMMENT ON TABLE public.support_resistance IS
  'MANUAL INPUT ONLY — never auto-generated. Auto-refresh must never INSERT or UPDATE.';
