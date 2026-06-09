-- Manual watchlist: priority rank + normalized category codes (safe migration)

ALTER TABLE public.watchlist
  ADD COLUMN IF NOT EXISTS priority_rank INTEGER NOT NULL DEFAULT 0;

-- Drop legacy constraint before normalizing values
ALTER TABLE public.watchlist
  DROP CONSTRAINT IF EXISTS watchlist_category_check;

UPDATE public.watchlist
SET watchlist_category = 'SECTOR_LEADER'
WHERE watchlist_category IN (
  'Sector Leader',
  'SECTOR LEADER',
  'sector leader',
  'Sector Leaders',
  'sector leaders'
);

UPDATE public.watchlist
SET watchlist_category = 'TOP7'
WHERE watchlist_category IN (
  'Top 7',
  'TOP 7',
  'top 7'
);

UPDATE public.watchlist
SET watchlist_category = 'ETF'
WHERE watchlist_category IN (
  'Etf',
  'etf'
);

UPDATE public.watchlist
SET watchlist_category = 'PULLBACK'
WHERE watchlist_category IN (
  'Pullback',
  'pullback',
  'Pullbacks',
  'pullbacks',
  'PULLBACKS'
);

ALTER TABLE public.watchlist
  ADD CONSTRAINT watchlist_category_check
  CHECK (
    watchlist_category IN (
      'ETF',
      'SECTOR_LEADER',
      'TOP7',
      'PULLBACK'
    )
  );

CREATE INDEX IF NOT EXISTS idx_watchlist_category_priority
  ON public.watchlist(user_id, watchlist_category, priority_rank, sort_order);

COMMENT ON COLUMN public.watchlist.watchlist_category IS
  'Scanner category code: ETF, SECTOR_LEADER, TOP7, or PULLBACK.';

COMMENT ON COLUMN public.watchlist.priority_rank IS
  'Personal rank within category (1 = highest preference). Used by scanner ordering.';

-- Auto watchlist: record Yahoo/FMP source per result row
ALTER TABLE public.auto_watchlist_results
  ADD COLUMN IF NOT EXISTS data_source TEXT NOT NULL DEFAULT 'mock';

ALTER TABLE public.auto_watchlist_results
  DROP CONSTRAINT IF EXISTS auto_watchlist_results_data_source_check;

ALTER TABLE public.auto_watchlist_results
  ADD CONSTRAINT auto_watchlist_results_data_source_check
  CHECK (data_source IN ('yahoo', 'fmp', 'mock', 'mixed'));

COMMENT ON COLUMN public.auto_watchlist_results.data_source IS
  'Market data provider used for this screener row: yahoo, fmp, mock, or mixed.';
