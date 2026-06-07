-- Phase 1: Weekly market updates and scanner scores
-- S/R fields in weekly_market_updates are manually entered (PROJECT_RULES.md).

CREATE TABLE public.weekly_market_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  watchlist_id UUID NOT NULL REFERENCES public.watchlist(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  week_ending DATE NOT NULL,
  support_1 NUMERIC(12, 4),
  support_2 NUMERIC(12, 4),
  resistance_1 NUMERIC(12, 4),
  resistance_2 NUMERIC(12, 4),
  analyst_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (watchlist_id, week_ending)
);

COMMENT ON TABLE public.weekly_market_updates IS
  'Friday market briefings. S/R levels are manually entered — never auto-generated.';
COMMENT ON COLUMN public.weekly_market_updates.support_1 IS 'Manually entered primary support.';
COMMENT ON COLUMN public.weekly_market_updates.resistance_1 IS 'Manually entered primary resistance.';

CREATE TABLE public.scanner_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  watchlist_id UUID NOT NULL REFERENCES public.watchlist(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  trend_score NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (trend_score >= 0 AND trend_score <= 100),
  stochastic_score NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (stochastic_score >= 0 AND stochastic_score <= 100),
  ema_score NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (ema_score >= 0 AND ema_score <= 100),
  support_resistance_score NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (support_resistance_score >= 0 AND support_resistance_score <= 100),
  premium_score NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (premium_score >= 0 AND premium_score <= 100),
  total_score NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (total_score >= 0 AND total_score <= 100),
  recommended_strategy public.strategy_type,
  action public.scanner_action NOT NULL DEFAULT 'watch',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (watchlist_id, score_date)
);

COMMENT ON COLUMN public.scanner_scores.support_resistance_score IS
  'Derived from manually entered S/R levels only — never from auto-generated levels.';

CREATE TRIGGER set_weekly_market_updates_updated_at
  BEFORE UPDATE ON public.weekly_market_updates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_scanner_scores_updated_at
  BEFORE UPDATE ON public.scanner_scores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_weekly_market_updates_user_id ON public.weekly_market_updates(user_id);
CREATE INDEX idx_weekly_market_updates_watchlist_id ON public.weekly_market_updates(watchlist_id);
CREATE INDEX idx_weekly_market_updates_ticker ON public.weekly_market_updates(ticker);
CREATE INDEX idx_weekly_market_updates_week_ending ON public.weekly_market_updates(week_ending DESC);
CREATE INDEX idx_weekly_market_updates_user_week ON public.weekly_market_updates(user_id, week_ending DESC);

CREATE INDEX idx_scanner_scores_user_id ON public.scanner_scores(user_id);
CREATE INDEX idx_scanner_scores_watchlist_id ON public.scanner_scores(watchlist_id);
CREATE INDEX idx_scanner_scores_ticker ON public.scanner_scores(ticker);
CREATE INDEX idx_scanner_scores_score_date ON public.scanner_scores(score_date DESC);
CREATE INDEX idx_scanner_scores_total_score ON public.scanner_scores(total_score DESC);
CREATE INDEX idx_scanner_scores_user_date ON public.scanner_scores(user_id, score_date DESC);
CREATE INDEX idx_scanner_scores_user_total ON public.scanner_scores(user_id, total_score DESC);
