-- Phase 16C: New tables from approved schema (16B)
-- Existing tables from Phases 1–16A are unchanged here.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.crypto_position_type AS ENUM ('holding', 'cash');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.snapshot_entry_source AS ENUM ('user', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.import_export_operation AS ENUM ('import', 'export');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.stock_market AS ENUM ('US', 'SG');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- user_settings — Settings page preferences (one row per user)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_usd_sgd_rate NUMERIC(10, 6) NOT NULL DEFAULT 1.35,
  default_assumed_yield_pct NUMERIC(5, 2),
  portfolio_history_default_filter TEXT NOT NULL DEFAULT '7D',
  portfolio_chart_default_range TEXT NOT NULL DEFAULT '7D',
  timezone TEXT NOT NULL DEFAULT 'Asia/Singapore',
  preferred_dividend_provider TEXT NOT NULL DEFAULT 'mock'
    CHECK (preferred_dividend_provider IN ('fmp', 'alpha_vantage', 'mock')),
  preferred_market_data_provider TEXT NOT NULL DEFAULT 'mock',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

COMMENT ON TABLE public.user_settings IS
  'User display and default preferences. API keys remain server-side env vars only.';

CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id
  ON public.user_settings(user_id);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own user_settings"
  ON public.user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- technical_indicators — persisted scanner indicators (replaces mock-only)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.technical_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  watchlist_id UUID NOT NULL REFERENCES public.watchlist(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  indicator_date DATE NOT NULL DEFAULT CURRENT_DATE,
  atr_14 NUMERIC(12, 4),
  ema_20 NUMERIC(12, 4),
  sma_50 NUMERIC(12, 4),
  sma_200 NUMERIC(12, 4),
  stochastic NUMERIC(5, 2)
    CHECK (stochastic IS NULL OR (stochastic >= 0 AND stochastic <= 100)),
  source TEXT NOT NULL DEFAULT 'computed',
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (watchlist_id, indicator_date)
);

COMMENT ON TABLE public.technical_indicators IS
  'ATR, EMA, SMA, Stochastic per watchlist ticker. Auto-refresh may UPDATE; never writes support/resistance.';

CREATE TRIGGER set_technical_indicators_updated_at
  BEFORE UPDATE ON public.technical_indicators
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_technical_indicators_user_date
  ON public.technical_indicators(user_id, indicator_date DESC);
CREATE INDEX IF NOT EXISTS idx_technical_indicators_watchlist
  ON public.technical_indicators(watchlist_id, indicator_date DESC);

ALTER TABLE public.technical_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own technical_indicators via watchlist"
  ON public.technical_indicators FOR ALL
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.watchlist w
      WHERE w.id = technical_indicators.watchlist_id
        AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.watchlist w
      WHERE w.id = technical_indicators.watchlist_id
        AND w.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- portfolio_milestone_thresholds — custom goal milestones (replaces localStorage)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.portfolio_milestone_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  threshold_sgd NUMERIC(14, 2) NOT NULL CHECK (threshold_sgd > 0),
  label TEXT NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT TRUE,
  reached_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, threshold_sgd)
);

COMMENT ON TABLE public.portfolio_milestone_thresholds IS
  'Portfolio value milestones for Financial Goals. Uses My Portfolio Value only.';

CREATE TRIGGER set_portfolio_milestone_thresholds_updated_at
  BEFORE UPDATE ON public.portfolio_milestone_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_portfolio_milestone_thresholds_user
  ON public.portfolio_milestone_thresholds(user_id, threshold_sgd);

ALTER TABLE public.portfolio_milestone_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own portfolio_milestone_thresholds"
  ON public.portfolio_milestone_thresholds FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- auto_watchlist_runs — screener execution header
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.auto_watchlist_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  market_data_source TEXT NOT NULL DEFAULT 'mock'
    CHECK (market_data_source IN ('mock', 'api')),
  provider_name TEXT,
  status TEXT NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'partial', 'failed')),
  records_written INTEGER NOT NULL DEFAULT 0 CHECK (records_written >= 0),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.auto_watchlist_runs IS
  'Each auto-watchlist screener refresh. Results link via run_id.';

CREATE TRIGGER set_auto_watchlist_runs_updated_at
  BEFORE UPDATE ON public.auto_watchlist_runs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_auto_watchlist_runs_user_generated
  ON public.auto_watchlist_runs(user_id, generated_at DESC);

ALTER TABLE public.auto_watchlist_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own auto_watchlist_runs"
  ON public.auto_watchlist_runs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Link existing results to runs (nullable for legacy rows)
ALTER TABLE public.auto_watchlist_results
  ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES public.auto_watchlist_runs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_auto_watchlist_results_run_id
  ON public.auto_watchlist_results(run_id);

CREATE INDEX IF NOT EXISTS idx_auto_watchlist_results_user_category_generated
  ON public.auto_watchlist_results(user_id, category, generated_at DESC);

-- ---------------------------------------------------------------------------
-- import_export_logs — Import / Export Center audit trail
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.import_export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation public.import_export_operation NOT NULL,
  entity_type TEXT NOT NULL,
  file_name TEXT,
  row_count INTEGER NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  error_count INTEGER NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  status TEXT NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'partial', 'failed')),
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.import_export_logs IS
  'Audit log for CSV/Excel/PDF import and export operations.';

CREATE TRIGGER set_import_export_logs_updated_at
  BEFORE UPDATE ON public.import_export_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_import_export_logs_user_created
  ON public.import_export_logs(user_id, created_at DESC);

ALTER TABLE public.import_export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own import_export_logs"
  ON public.import_export_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
