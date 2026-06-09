-- Idempotent fix for databases that still have legacy watchlist_category values.
-- Safe to run after 20260606290000 and/or 20260609140000.

ALTER TABLE public.watchlist
  ADD COLUMN IF NOT EXISTS priority_rank INTEGER NOT NULL DEFAULT 0;

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

COMMENT ON COLUMN public.watchlist.watchlist_category IS
  'Scanner category code: ETF, SECTOR_LEADER, TOP7, or PULLBACK.';
