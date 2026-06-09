-- Stock/ETF transaction history and manual position adjustment audit log

CREATE TABLE public.stock_etf_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  holding_id UUID NOT NULL REFERENCES public.stock_etf_holdings(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shares NUMERIC(14, 4) NOT NULL CHECK (shares > 0),
  price_per_share NUMERIC(14, 4) NOT NULL CHECK (price_per_share >= 0),
  total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
  fees NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (fees >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.stock_etf_transactions IS
  'Immutable buy/sell history — primary source of truth for stock/ETF positions.';

CREATE TRIGGER set_stock_etf_transactions_updated_at
  BEFORE UPDATE ON public.stock_etf_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_stock_etf_transactions_holding_id
  ON public.stock_etf_transactions(holding_id);
CREATE INDEX idx_stock_etf_transactions_user_id
  ON public.stock_etf_transactions(user_id);
CREATE INDEX idx_stock_etf_transactions_date
  ON public.stock_etf_transactions(transaction_date DESC);

ALTER TABLE public.stock_etf_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own stock_etf_transactions"
  ON public.stock_etf_transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.stock_etf_position_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  holding_id UUID NOT NULL REFERENCES public.stock_etf_holdings(id) ON DELETE CASCADE,
  adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  previous_shares NUMERIC(14, 4),
  new_shares NUMERIC(14, 4),
  previous_average_cost NUMERIC(14, 4),
  new_average_cost NUMERIC(14, 4),
  previous_total_cost NUMERIC(14, 2),
  new_total_cost NUMERIC(14, 2),
  previous_notes TEXT,
  new_notes TEXT,
  adjustment_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.stock_etf_position_adjustments IS
  'Audit log for manual position overrides — never overwrites transaction history.';

CREATE INDEX idx_stock_etf_position_adjustments_holding_id
  ON public.stock_etf_position_adjustments(holding_id);
CREATE INDEX idx_stock_etf_position_adjustments_user_id
  ON public.stock_etf_position_adjustments(user_id);
CREATE INDEX idx_stock_etf_position_adjustments_date
  ON public.stock_etf_position_adjustments(adjustment_date DESC);

ALTER TABLE public.stock_etf_position_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own stock_etf_position_adjustments"
  ON public.stock_etf_position_adjustments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
