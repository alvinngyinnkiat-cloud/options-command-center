-- Phase 2.5: Multi-currency holdings and manual portfolio overrides

CREATE TYPE public.currency_code AS ENUM ('SGD', 'USD');

ALTER TABLE public.holdings
  ADD COLUMN currency public.currency_code NOT NULL DEFAULT 'USD',
  ADD COLUMN market_value_native NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN fx_rate_to_sgd NUMERIC(10, 6) NOT NULL DEFAULT 1,
  ADD COLUMN market_value_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0;

-- Backfill from existing market_value (assume USD at default broker rate)
UPDATE public.holdings
SET
  market_value_native = market_value,
  fx_rate_to_sgd = 1.35,
  market_value_sgd = ROUND(market_value * 1.35, 2)
WHERE market_value_native = 0;

COMMENT ON COLUMN public.holdings.market_value_native IS
  'Market value in the holding''s native currency (SGD or USD).';
COMMENT ON COLUMN public.holdings.fx_rate_to_sgd IS
  'Manual FX rate to SGD. Not auto-fetched — user/broker rate may differ.';
COMMENT ON COLUMN public.holdings.market_value_sgd IS
  'market_value_native converted to SGD using fx_rate_to_sgd.';

CREATE TABLE public.portfolio_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  use_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  manual_usd_sgd_rate NUMERIC(10, 6) NOT NULL DEFAULT 1.35,
  manual_total_portfolio_value_sgd NUMERIC(14, 2),
  manual_stocks_value_sgd NUMERIC(14, 2),
  manual_etfs_value_sgd NUMERIC(14, 2),
  manual_crypto_value_sgd NUMERIC(14, 2),
  manual_cash_value_sgd NUMERIC(14, 2),
  override_reason TEXT,
  override_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

COMMENT ON TABLE public.portfolio_overrides IS
  'Manual broker-reported portfolio values in SGD. Used when use_manual_override is true.';

CREATE TRIGGER set_portfolio_overrides_updated_at
  BEFORE UPDATE ON public.portfolio_overrides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_holdings_currency ON public.holdings(currency);
CREATE INDEX idx_portfolio_overrides_user_id ON public.portfolio_overrides(user_id);

ALTER TABLE public.portfolio_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own portfolio_overrides"
  ON public.portfolio_overrides FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
