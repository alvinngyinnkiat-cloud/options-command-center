-- Portfolio reconciliation: US USD + manual SGD equivalent + SG + crypto (no FX input)

ALTER TABLE public.portfolio_overrides
  ADD COLUMN IF NOT EXISTS manual_us_stocks_options_value_usd NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS manual_us_stocks_options_sgd_equivalent NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS manual_sg_stocks_cash_value_sgd NUMERIC(14, 2);

UPDATE public.portfolio_overrides
SET manual_us_stocks_options_sgd_equivalent = manual_stocks_value_sgd
WHERE manual_us_stocks_options_sgd_equivalent IS NULL
  AND manual_stocks_value_sgd IS NOT NULL;

COMMENT ON COLUMN public.portfolio_overrides.manual_us_stocks_options_value_usd IS
  'Broker-reported US stocks, ETFs, options, and USD cash — native USD.';
COMMENT ON COLUMN public.portfolio_overrides.manual_us_stocks_options_sgd_equivalent IS
  'Broker-reported SGD equivalent for the US bucket — entered manually, not FX-derived.';
COMMENT ON COLUMN public.portfolio_overrides.manual_sg_stocks_cash_value_sgd IS
  'Singapore stocks, ETFs, and SGD cash.';
