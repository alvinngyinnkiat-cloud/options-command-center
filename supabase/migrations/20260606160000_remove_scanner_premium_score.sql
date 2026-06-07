-- Remove premium score from scanner — premium belongs in Trade Builder / Options Chain / Entry

ALTER TABLE public.scanner_scores
  DROP COLUMN IF EXISTS premium_score,
  DROP COLUMN IF EXISTS premium_pass,
  DROP COLUMN IF EXISTS premium_reason;

COMMENT ON TABLE public.scanner_scores IS
  'Watchlist scanner scores. Premium analysis is evaluated at trade entry, not here.';
