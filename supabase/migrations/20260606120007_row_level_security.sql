-- Phase 1: Row Level Security policies
-- Users can only access their own data. market_data is scoped via watchlist ownership.

ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_resistance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_market_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanner_scores ENABLE ROW LEVEL SECURITY;

-- User-scoped tables: full CRUD for own rows
CREATE POLICY "Users manage own portfolio_snapshots"
  ON public.portfolio_snapshots FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own holdings"
  ON public.holdings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own financial_goals"
  ON public.financial_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own watchlist"
  ON public.watchlist FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own market_data via watchlist"
  ON public.market_data FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.watchlist w
      WHERE w.id = market_data.watchlist_id AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.watchlist w
      WHERE w.id = market_data.watchlist_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users manage own support_resistance"
  ON public.support_resistance FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own options_trades"
  ON public.options_trades FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own trading_journal"
  ON public.trading_journal FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own risk_settings"
  ON public.risk_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own alerts"
  ON public.alerts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own reports"
  ON public.reports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own weekly_market_updates"
  ON public.weekly_market_updates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own scanner_scores"
  ON public.scanner_scores FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
