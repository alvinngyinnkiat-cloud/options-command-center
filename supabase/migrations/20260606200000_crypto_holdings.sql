-- Phase 8.5: Crypto Trade Tracker — SGD capital invested, no buy price required

CREATE TABLE public.crypto_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_label TEXT NOT NULL CHECK (asset_label IN ('BTC', 'ETH', 'SOL', 'Other')),
  ticker TEXT NOT NULL,
  total_invested_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_invested_sgd >= 0),
  current_value_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (current_value_sgd >= 0),
  notes TEXT,
  last_updated DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ticker)
);

COMMENT ON TABLE public.crypto_holdings IS
  'Crypto tracker by total SGD invested — no coin quantity or buy price required.';
COMMENT ON COLUMN public.crypto_holdings.total_invested_sgd IS
  'Total SGD capital put into this asset (not per-coin buy price).';
COMMENT ON COLUMN public.crypto_holdings.current_value_sgd IS
  'Current total value of this holding in SGD.';

CREATE TRIGGER set_crypto_holdings_updated_at
  BEFORE UPDATE ON public.crypto_holdings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_crypto_holdings_user_id ON public.crypto_holdings(user_id);
CREATE INDEX idx_crypto_holdings_ticker ON public.crypto_holdings(ticker);

ALTER TABLE public.crypto_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own crypto_holdings"
  ON public.crypto_holdings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
