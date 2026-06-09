-- Split Singapore manual portfolio into stocks and cash components

ALTER TABLE public.portfolio_overrides
  ADD COLUMN IF NOT EXISTS manual_sg_stocks_value_sgd NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS manual_sg_cash_value_sgd NUMERIC(12, 2);

COMMENT ON COLUMN public.portfolio_overrides.manual_sg_stocks_value_sgd IS
  'Manual SG stocks and ETFs value (SGD) — excludes SG cash.';

COMMENT ON COLUMN public.portfolio_overrides.manual_sg_cash_value_sgd IS
  'Manual SG broker cash value (SGD) — separate from Trading Cash SGD.';

UPDATE public.portfolio_overrides
SET manual_sg_stocks_value_sgd = manual_sg_stocks_cash_value_sgd
WHERE manual_sg_stocks_cash_value_sgd IS NOT NULL
  AND manual_sg_stocks_value_sgd IS NULL
  AND manual_sg_cash_value_sgd IS NULL;
