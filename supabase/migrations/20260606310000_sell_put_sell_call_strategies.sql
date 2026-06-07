-- Sell Put / Sell Call — future-ready single-leg strategies

ALTER TYPE public.strategy_type ADD VALUE IF NOT EXISTS 'sell_put';
ALTER TYPE public.strategy_type ADD VALUE IF NOT EXISTS 'sell_call';

ALTER TABLE public.options_trades
  ADD COLUMN IF NOT EXISTS sell_call_coverage TEXT
    CHECK (sell_call_coverage IS NULL OR sell_call_coverage IN ('covered', 'naked'))
    DEFAULT 'covered',
  ADD COLUMN IF NOT EXISTS shares_owned INTEGER
    CHECK (shares_owned IS NULL OR shares_owned >= 0);

COMMENT ON COLUMN public.options_trades.sell_call_coverage IS
  'Covered or naked for sell_call strategy. Defaults to covered; naked shows unlimited risk warning.';
COMMENT ON COLUMN public.options_trades.shares_owned IS
  'Shares owned at entry for sell_call covered call sizing.';
