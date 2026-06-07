-- Phase 6: Strategy recommendation fields on scanner_scores

ALTER TABLE public.scanner_scores
  ADD COLUMN primary_reason TEXT,
  ADD COLUMN pass_fail_explanation TEXT,
  ADD COLUMN warning_notes TEXT;

COMMENT ON COLUMN public.scanner_scores.recommended_strategy IS
  'Phase 6 recommended strategy. NULL when No Trade.';
COMMENT ON COLUMN public.scanner_scores.primary_reason IS
  'Primary reason for recommended strategy or No Trade.';
COMMENT ON COLUMN public.scanner_scores.pass_fail_explanation IS
  'Pass/fail summary for recommendation rule checks.';
COMMENT ON COLUMN public.scanner_scores.warning_notes IS
  'JSON array of warning strings.';
