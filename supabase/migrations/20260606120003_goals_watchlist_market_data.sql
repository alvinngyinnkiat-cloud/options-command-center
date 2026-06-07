-- Phase 1: Financial goals, watchlist, and market data

CREATE TABLE public.financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal_type public.goal_type NOT NULL DEFAULT 'custom',
  target_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  current_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  target_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ticker)
);

-- Market data is scoped to a watchlist entry (one row per ticker per date)
CREATE TABLE public.market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES public.watchlist(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  price_date DATE NOT NULL,
  open NUMERIC(12, 4),
  high NUMERIC(12, 4),
  low NUMERIC(12, 4),
  close NUMERIC(12, 4) NOT NULL,
  volume BIGINT,
  vix NUMERIC(8, 4),
  iv_rank NUMERIC(5, 2) CHECK (iv_rank IS NULL OR (iv_rank >= 0 AND iv_rank <= 100)),
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (watchlist_id, price_date)
);

COMMENT ON TABLE public.market_data IS
  'Cached OHLCV per watchlist ticker. Does NOT generate support/resistance.';

CREATE TRIGGER set_financial_goals_updated_at
  BEFORE UPDATE ON public.financial_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_watchlist_updated_at
  BEFORE UPDATE ON public.watchlist
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_market_data_updated_at
  BEFORE UPDATE ON public.market_data
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_financial_goals_user_id ON public.financial_goals(user_id);
CREATE INDEX idx_financial_goals_user_active ON public.financial_goals(user_id, is_active);

CREATE INDEX idx_watchlist_user_id ON public.watchlist(user_id);
CREATE INDEX idx_watchlist_user_active ON public.watchlist(user_id, is_active);
CREATE INDEX idx_watchlist_user_sort ON public.watchlist(user_id, sort_order);

CREATE INDEX idx_market_data_watchlist_id ON public.market_data(watchlist_id);
CREATE INDEX idx_market_data_ticker ON public.market_data(ticker);
CREATE INDEX idx_market_data_price_date ON public.market_data(price_date DESC);
CREATE INDEX idx_market_data_watchlist_date ON public.market_data(watchlist_id, price_date DESC);
