-- Crypto Tracker V2 — standalone fee transaction type

ALTER TABLE public.crypto_transactions
  DROP CONSTRAINT IF EXISTS crypto_transactions_transaction_type_check;

ALTER TABLE public.crypto_transactions
  ADD CONSTRAINT crypto_transactions_transaction_type_check
  CHECK (
    transaction_type IN (
      'deposit',
      'monthly_contribution',
      'buy',
      'sell',
      'fee',
      'manual_adjustment',
      'manual_cash_update'
    )
  );
