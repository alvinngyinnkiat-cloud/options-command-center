-- Manual crypto tracker totals (no live price feed)
ALTER TABLE portfolio_overrides
  ADD COLUMN IF NOT EXISTS manual_crypto_holdings_sgd NUMERIC(14, 2) NULL,
  ADD COLUMN IF NOT EXISTS manual_crypto_contributions_sgd NUMERIC(14, 2) NULL;

COMMENT ON COLUMN portfolio_overrides.manual_crypto_holdings_sgd IS
  'User-entered coin holdings value (SGD) — excludes crypto cash.';
COMMENT ON COLUMN portfolio_overrides.manual_crypto_contributions_sgd IS
  'Total crypto contributions / cost (SGD) for portfolio-level P/L.';
