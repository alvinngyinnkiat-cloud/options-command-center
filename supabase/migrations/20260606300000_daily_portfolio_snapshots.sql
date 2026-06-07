-- Daily portfolio snapshot history (official portfolio history database)
CREATE TABLE IF NOT EXISTS public.daily_portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  portfolio_value_sgd NUMERIC(14, 2) NOT NULL,
  stock_options_value_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0,
  crypto_value_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0,
  usd_cash NUMERIC(14, 2) NOT NULL DEFAULT 0,
  sgd_cash NUMERIC(14, 2) NOT NULL DEFAULT 0,
  open_risk NUMERIC(14, 2) NOT NULL DEFAULT 0,
  available_risk_capacity NUMERIC(14, 2) NOT NULL DEFAULT 0,
  personal_unrealized_pnl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  personal_realized_pnl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  client_pnl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  portfolio_health_score NUMERIC(5, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_portfolio_snapshots_user_date
  ON public.daily_portfolio_snapshots (user_id, snapshot_date DESC);

ALTER TABLE public.daily_portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own daily_portfolio_snapshots"
  ON public.daily_portfolio_snapshots FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
