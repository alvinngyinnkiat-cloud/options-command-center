-- Manual Crypto Cash (stablecoins / exchange cash in SGD equivalent)
-- Idempotent: safe if a nullable column was partially added earlier.

ALTER TABLE public.portfolio_overrides
  ADD COLUMN IF NOT EXISTS manual_crypto_cash_sgd NUMERIC(14, 2);

UPDATE public.portfolio_overrides
SET manual_crypto_cash_sgd = 0
WHERE manual_crypto_cash_sgd IS NULL;

ALTER TABLE public.portfolio_overrides
  ALTER COLUMN manual_crypto_cash_sgd SET DEFAULT 0;

ALTER TABLE public.portfolio_overrides
  ALTER COLUMN manual_crypto_cash_sgd SET NOT NULL;

COMMENT ON COLUMN public.portfolio_overrides.manual_crypto_cash_sgd IS
  'Manual stablecoin / exchange cash (SGD). In Portfolio Value and Crypto Portfolio Value; excluded from Trading Capital and Trading Cash SGD. Default 0 until saved via Manual Crypto Cash.';
