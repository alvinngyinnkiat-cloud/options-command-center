-- Phase 5: Scanner score breakdown and pass/fail reasons

ALTER TABLE public.scanner_scores
  ADD COLUMN decision_label TEXT NOT NULL DEFAULT 'No Trade',
  ADD COLUMN trend_pass BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN stochastic_pass BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN ema_pass BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN sr_pass BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN premium_pass BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN trend_reason TEXT,
  ADD COLUMN stochastic_reason TEXT,
  ADD COLUMN ema_reason TEXT,
  ADD COLUMN sr_reason TEXT,
  ADD COLUMN premium_reason TEXT;

COMMENT ON COLUMN public.scanner_scores.decision_label IS
  'Trade Immediately | Strong Candidate | Watchlist | No Trade';
COMMENT ON COLUMN public.scanner_scores.recommended_strategy IS
  'Trend-derived candidate strategy used for scoring — not a separate recommendation engine.';
COMMENT ON COLUMN public.scanner_scores.trend_reason IS
  'Pass/fail explanation for trend score component.';
