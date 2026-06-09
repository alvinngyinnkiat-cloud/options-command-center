-- Closed trade broker reconciliation: fees and manual P/L override

ALTER TABLE public.options_trades
  ADD COLUMN IF NOT EXISTS fees_commission NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS broker_realized_pnl NUMERIC(12, 2);

COMMENT ON COLUMN public.options_trades.fees_commission IS
  'Round-trip fees/commission (USD) subtracted from closed trade realized P/L.';

COMMENT ON COLUMN public.options_trades.broker_realized_pnl IS
  'Manual broker-reported realized P/L (USD). When set, overrides calculated P/L.';
