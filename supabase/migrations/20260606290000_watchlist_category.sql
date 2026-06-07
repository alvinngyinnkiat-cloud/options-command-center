-- Watchlist scanner categories: ETF, Sector Leader, Top 7, Pullbacks

ALTER TABLE public.watchlist
  ADD COLUMN IF NOT EXISTS watchlist_category TEXT NOT NULL DEFAULT 'ETF';

ALTER TABLE public.watchlist
  DROP CONSTRAINT IF EXISTS watchlist_category_check;

ALTER TABLE public.watchlist
  ADD CONSTRAINT watchlist_category_check
  CHECK (watchlist_category IN ('ETF', 'Sector Leader', 'Top 7', 'Pullbacks'));

UPDATE public.watchlist
SET watchlist_category = CASE
  WHEN ticker IN ('XSP', 'SPY', 'QQQ', 'IWM', 'GLD') THEN 'ETF'
  WHEN ticker IN ('JPM', 'XOM', 'WMT', 'CAT', 'UNH', 'HD') THEN 'Sector Leader'
  WHEN ticker IN ('AVGO', 'AMZN', 'META', 'GOOGL', 'MSFT', 'AAPL', 'NVDA') THEN 'Top 7'
  ELSE 'Pullbacks'
END
WHERE watchlist_category = 'ETF'
  OR watchlist_category IS NULL;

CREATE INDEX IF NOT EXISTS idx_watchlist_category
  ON public.watchlist(user_id, watchlist_category, sort_order);

COMMENT ON COLUMN public.watchlist.watchlist_category IS
  'Scanner category: ETF, Sector Leader, Top 7, or Pullbacks (auto-watchlist / manual adds).';
