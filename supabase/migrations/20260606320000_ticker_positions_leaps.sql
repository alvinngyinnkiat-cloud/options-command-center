-- Ticker Position Manager — LEAPS, vertical call spread, parent/child links

ALTER TYPE public.strategy_type ADD VALUE IF NOT EXISTS 'leaps';
ALTER TYPE public.strategy_type ADD VALUE IF NOT EXISTS 'vertical_call_spread';

ALTER TABLE public.options_trades
  ADD COLUMN IF NOT EXISTS parent_trade_id UUID
    REFERENCES public.options_trades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_cost NUMERIC(12, 2)
    CHECK (original_cost IS NULL OR original_cost >= 0);

CREATE INDEX IF NOT EXISTS idx_options_trades_parent_trade_id
  ON public.options_trades (parent_trade_id)
  WHERE parent_trade_id IS NOT NULL;

COMMENT ON COLUMN public.options_trades.parent_trade_id IS
  'Links income trades (e.g. covered calls) to a parent LEAPS position.';
COMMENT ON COLUMN public.options_trades.original_cost IS
  'Total USD cost basis for LEAPS / debit long positions.';
