-- Fix: manual_client_portfolio_sgd missing from portfolio_overrides (Phase 17A)
-- Renamed from 20260608170000 — that version was already used by stock_etf_transactions_adjustments.

ALTER TABLE public.portfolio_overrides
  ADD COLUMN IF NOT EXISTS manual_client_portfolio_sgd NUMERIC(18, 2) DEFAULT 0;

UPDATE public.portfolio_overrides
SET manual_client_portfolio_sgd = 0
WHERE manual_client_portfolio_sgd IS NULL;

ALTER TABLE public.portfolio_overrides
  ALTER COLUMN manual_client_portfolio_sgd SET DEFAULT 0;

COMMENT ON COLUMN public.portfolio_overrides.manual_client_portfolio_sgd IS
  'Manual client-owned portfolio slice (SGD). My portfolio = total section value minus this amount.';
