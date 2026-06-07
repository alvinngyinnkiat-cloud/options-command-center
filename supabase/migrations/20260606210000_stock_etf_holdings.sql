-- Phase 8.6: Stock & ETF Tracker — long-term equities separate from options

CREATE TABLE public.stock_etf_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'etf')),
  currency TEXT NOT NULL CHECK (currency IN ('SGD', 'USD')),
  sector TEXT NOT NULL DEFAULT 'Others' CHECK (
    sector IN ('Technology', 'Financials', 'Healthcare', 'Energy', 'Consumer', 'Others')
  ),
  total_invested_native NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_invested_native >= 0),
  current_value_native NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (current_value_native >= 0),
  fx_rate_to_sgd NUMERIC(10, 6) NOT NULL DEFAULT 1.35,
  total_invested_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_invested_sgd >= 0),
  current_value_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (current_value_sgd >= 0),
  shares_held NUMERIC(14, 4),
  average_cost NUMERIC(14, 4),
  notes TEXT,
  last_updated DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ticker)
);

COMMENT ON TABLE public.stock_etf_holdings IS
  'Long-term stock and ETF positions — separate from options trades and crypto.';

CREATE TRIGGER set_stock_etf_holdings_updated_at
  BEFORE UPDATE ON public.stock_etf_holdings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_stock_etf_holdings_user_id ON public.stock_etf_holdings(user_id);
CREATE INDEX idx_stock_etf_holdings_ticker ON public.stock_etf_holdings(ticker);

ALTER TABLE public.stock_etf_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own stock_etf_holdings"
  ON public.stock_etf_holdings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
