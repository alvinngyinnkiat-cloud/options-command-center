-- Stock & ETF Tracker V2 — per-market cash balances + unified ledger

CREATE TABLE public.stock_etf_cash_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_category TEXT NOT NULL CHECK (
    market_category IN ('us_etf', 'us_stock', 'sg_stock')
  ),
  cash_native NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (cash_native >= 0),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'SGD')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, market_category)
);

COMMENT ON TABLE public.stock_etf_cash_balances IS
  'Available cash per stock/ETF market bucket — US ETF USD, US Stock USD, SG Stock SGD.';

CREATE TRIGGER set_stock_etf_cash_balances_updated_at
  BEFORE UPDATE ON public.stock_etf_cash_balances
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.stock_etf_cash_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own stock_etf_cash_balances"
  ON public.stock_etf_cash_balances FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.stock_etf_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  holding_id UUID REFERENCES public.stock_etf_holdings(id) ON DELETE SET NULL,
  market_category TEXT NOT NULL CHECK (
    market_category IN ('us_etf', 'us_stock', 'sg_stock')
  ),
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN (
      'monthly_contribution',
      'manual_cash_sync',
      'buy',
      'sell',
      'dividend',
      'manual_adjustment'
    )
  ),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ticker TEXT,
  shares NUMERIC(14, 4),
  amount_native NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (amount_native >= 0),
  fee_native NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (fee_native >= 0),
  net_amount_native NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'SGD')),
  fx_rate_to_sgd NUMERIC(10, 6),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.stock_etf_ledger IS
  'Unified stock/ETF transaction history — buys, sells, cash flows, adjustments.';

CREATE TRIGGER set_stock_etf_ledger_updated_at
  BEFORE UPDATE ON public.stock_etf_ledger
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_stock_etf_ledger_user_date
  ON public.stock_etf_ledger(user_id, transaction_date DESC);

CREATE INDEX idx_stock_etf_ledger_holding
  ON public.stock_etf_ledger(holding_id)
  WHERE holding_id IS NOT NULL;

ALTER TABLE public.stock_etf_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own stock_etf_ledger"
  ON public.stock_etf_ledger FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
