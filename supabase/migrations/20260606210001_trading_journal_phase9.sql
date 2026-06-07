-- Phase 9: Trading Journal structured entry/exit fields

ALTER TABLE public.trading_journal
  ADD COLUMN IF NOT EXISTS strategy TEXT,
  ADD COLUMN IF NOT EXISTS dte INTEGER,
  ADD COLUMN IF NOT EXISTS contracts INTEGER,
  ADD COLUMN IF NOT EXISTS short_strike NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS long_strike NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS width NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS credit_received NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS breakeven NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS max_risk NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS buying_power_used NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS trade_score NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS confidence_level TEXT,
  ADD COLUMN IF NOT EXISTS reason_for_entry TEXT,
  ADD COLUMN IF NOT EXISTS exit_date DATE,
  ADD COLUMN IF NOT EXISTS exit_debit NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS days_held INTEGER,
  ADD COLUMN IF NOT EXISTS profit_loss NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS return_on_risk_pct NUMERIC(8, 4),
  ADD COLUMN IF NOT EXISTS win_loss TEXT CHECK (win_loss IN ('Win', 'Loss')),
  ADD COLUMN IF NOT EXISTS exit_reason TEXT,
  ADD COLUMN IF NOT EXISTS entry_setup TEXT,
  ADD COLUMN IF NOT EXISTS exit_outcome TEXT,
  ADD COLUMN IF NOT EXISTS what_went_well TEXT,
  ADD COLUMN IF NOT EXISTS what_to_improve TEXT,
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

COMMENT ON TABLE public.trading_journal IS
  'Options trade journal — entry/exit reasoning and lessons. S/R remains manual on watchlist only.';
