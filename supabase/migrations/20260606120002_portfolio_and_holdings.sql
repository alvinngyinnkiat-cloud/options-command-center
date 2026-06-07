-- Phase 1: Portfolio snapshots and holdings

CREATE TABLE public.portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  portfolio_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
  available_risk_capacity NUMERIC(14, 2) NOT NULL DEFAULT 0,
  options_allocation_pct NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (options_allocation_pct >= 0 AND options_allocation_pct <= 100),
  mtd_pnl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  mtd_pnl_pct NUMERIC(7, 4) NOT NULL DEFAULT 0,
  open_positions_count INTEGER NOT NULL DEFAULT 0 CHECK (open_positions_count >= 0),
  health_score NUMERIC(5, 2)
    CHECK (health_score IS NULL OR (health_score >= 0 AND health_score <= 100)),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, snapshot_date)
);

CREATE TABLE public.holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES public.portfolio_snapshots(id) ON DELETE SET NULL,
  ticker TEXT NOT NULL,
  asset_type public.asset_type NOT NULL DEFAULT 'stock',
  quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
  market_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
  cost_basis NUMERIC(14, 2),
  strategy public.strategy_type,
  linked_trade_id UUID, -- FK added after options_trades table
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_portfolio_snapshots_updated_at
  BEFORE UPDATE ON public.portfolio_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_holdings_updated_at
  BEFORE UPDATE ON public.holdings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_portfolio_snapshots_user_id ON public.portfolio_snapshots(user_id);
CREATE INDEX idx_portfolio_snapshots_snapshot_date ON public.portfolio_snapshots(snapshot_date DESC);
CREATE INDEX idx_portfolio_snapshots_user_date ON public.portfolio_snapshots(user_id, snapshot_date DESC);

CREATE INDEX idx_holdings_user_id ON public.holdings(user_id);
CREATE INDEX idx_holdings_snapshot_id ON public.holdings(snapshot_id);
CREATE INDEX idx_holdings_ticker ON public.holdings(ticker);
CREATE INDEX idx_holdings_user_ticker ON public.holdings(user_id, ticker);
