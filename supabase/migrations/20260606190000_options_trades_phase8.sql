-- Phase 8: Options Trade Tracker extensions

ALTER TYPE public.trade_status ADD VALUE 'managed';
ALTER TYPE public.trade_status ADD VALUE 'rolled';

ALTER TABLE public.options_trades
  ADD COLUMN IF NOT EXISTS width NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS current_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exit_debit NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS realized_pnl NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS buying_power_used NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS breakeven_put NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS breakeven_call NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS take_profit_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS stop_loss_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS trade_score NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS recommended_strategy TEXT,
  ADD COLUMN IF NOT EXISTS confidence_level TEXT,
  ADD COLUMN IF NOT EXISTS reason_for_entry TEXT;

COMMENT ON COLUMN public.options_trades.credit_received IS
  'Premium received per contract (per-share credit).';
COMMENT ON COLUMN public.options_trades.current_value IS
  'Current cost to close (total dollars). Mark-to-market display input.';
COMMENT ON COLUMN public.options_trades.realized_pnl IS
  'Final P/L after close: total premium received minus exit debit.';
