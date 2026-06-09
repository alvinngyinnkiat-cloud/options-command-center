-- Option pricing fields: 4 decimal places for per-contract and derived values

ALTER TABLE public.options_trades
  ALTER COLUMN credit_received TYPE NUMERIC(12, 4),
  ALTER COLUMN current_value TYPE NUMERIC(12, 4),
  ALTER COLUMN exit_debit TYPE NUMERIC(12, 4),
  ALTER COLUMN take_profit_price TYPE NUMERIC(12, 4),
  ALTER COLUMN stop_loss_price TYPE NUMERIC(12, 4),
  ALTER COLUMN original_cost TYPE NUMERIC(12, 4);

COMMENT ON COLUMN public.options_trades.credit_received IS
  'Premium per contract (per-share credit), NUMERIC(12,4).';
COMMENT ON COLUMN public.options_trades.current_value IS
  'Total close cost USD: per-contract value × 100 × contracts, NUMERIC(12,4).';
COMMENT ON COLUMN public.options_trades.exit_debit IS
  'Total closing debit USD on close, NUMERIC(12,4).';
COMMENT ON COLUMN public.options_trades.take_profit_price IS
  'Dollar profit target at take-profit %, NUMERIC(12,4).';
COMMENT ON COLUMN public.options_trades.stop_loss_price IS
  'Dollar stop-loss threshold, NUMERIC(12,4).';
COMMENT ON COLUMN public.options_trades.original_cost IS
  'Total debit paid for long/LEAPS strategies, NUMERIC(12,4).';
