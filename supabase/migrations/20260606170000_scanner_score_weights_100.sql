-- Scanner score weights: Trend 35 + SO 25 + EMA20 20 + S/R 20 = 100

ALTER TABLE public.scanner_scores
  DROP CONSTRAINT IF EXISTS scanner_scores_total_score_check;

ALTER TABLE public.scanner_scores
  ADD CONSTRAINT scanner_scores_total_score_check
  CHECK (total_score >= 0 AND total_score <= 100);

COMMENT ON TABLE public.scanner_scores IS
  'Watchlist scanner scores (max 100: trend 35, stochastic 25, ema 20, S/R 20).';
