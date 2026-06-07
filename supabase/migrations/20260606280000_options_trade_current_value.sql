-- Manual broker current option value per contract

CREATE TYPE public.current_value_source AS ENUM ('manual', 'broker', 'system');

ALTER TABLE public.options_trades
  ADD COLUMN IF NOT EXISTS manual_current_option_value NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS system_current_option_value NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS current_value_source public.current_value_source NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS current_value_updated_at TIMESTAMPTZ;

UPDATE public.options_trades
SET system_current_option_value = CASE
  WHEN contracts > 0 THEN ROUND(current_value / (100.0 * contracts), 4)
  ELSE 0
END
WHERE system_current_option_value IS NULL;

COMMENT ON COLUMN public.options_trades.manual_current_option_value IS
  'Broker-reported current option value per contract — overrides system when set.';
COMMENT ON COLUMN public.options_trades.system_current_option_value IS
  'System-calculated current option value per contract.';
COMMENT ON COLUMN public.options_trades.current_value IS
  'Total close cost in USD: effective per-contract value × 100 × contracts.';
