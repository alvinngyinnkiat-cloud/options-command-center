-- Auto Watchlist Screener — discovery lists separate from manual options watchlist

CREATE TABLE public.auto_watchlist_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (
    category IN (
      'mega_cap_leaders',
      'mega_cap_pullback',
      'large_cap_pullback',
      'mid_large_cap_pullback'
    )
  ),
  rank INTEGER NOT NULL CHECK (rank >= 1),
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  market_cap NUMERIC(16, 2) NOT NULL,
  sector TEXT NOT NULL,
  current_price NUMERIC(12, 4) NOT NULL,
  one_year_performance_percent NUMERIC(8, 4) NOT NULL,
  fifty_two_week_high NUMERIC(12, 4) NOT NULL,
  fifty_two_week_low NUMERIC(12, 4) NOT NULL,
  distance_from_high_percent NUMERIC(8, 4) NOT NULL,
  distance_from_low_percent NUMERIC(8, 4) NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.auto_watchlist_results IS
  'Auto-generated discovery watchlists by market cap and 1-year performance — does not replace manual watchlist.';
COMMENT ON COLUMN public.auto_watchlist_results.market_cap IS
  'Market capitalization in USD billions.';

CREATE INDEX idx_auto_watchlist_results_user_id ON public.auto_watchlist_results(user_id);
CREATE INDEX idx_auto_watchlist_results_category ON public.auto_watchlist_results(category);
CREATE INDEX idx_auto_watchlist_results_generated_at ON public.auto_watchlist_results(generated_at DESC);

CREATE TRIGGER set_auto_watchlist_results_updated_at
  BEFORE UPDATE ON public.auto_watchlist_results
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.auto_watchlist_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own auto_watchlist_results"
  ON public.auto_watchlist_results FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
