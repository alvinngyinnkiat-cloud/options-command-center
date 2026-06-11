-- Crypto Tracker V4 — immutable transaction history

CREATE TABLE public.crypto_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  holding_id UUID REFERENCES public.crypto_holdings(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN (
      'deposit',
      'monthly_contribution',
      'buy',
      'sell',
      'manual_adjustment',
      'manual_cash_update'
    )
  ),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ticker TEXT,
  coin_name TEXT,
  amount_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (amount_sgd >= 0),
  fee_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (fee_sgd >= 0),
  net_amount_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.crypto_transactions IS
  'Immutable crypto transaction history — deposits, buys, sells, manual overrides.';

CREATE TRIGGER set_crypto_transactions_updated_at
  BEFORE UPDATE ON public.crypto_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_crypto_transactions_user_id
  ON public.crypto_transactions(user_id);

CREATE INDEX idx_crypto_transactions_holding_id
  ON public.crypto_transactions(holding_id)
  WHERE holding_id IS NOT NULL;

CREATE INDEX idx_crypto_transactions_date
  ON public.crypto_transactions(transaction_date DESC);

CREATE INDEX idx_crypto_transactions_user_type_date
  ON public.crypto_transactions(user_id, transaction_type, transaction_date DESC);

ALTER TABLE public.crypto_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own crypto_transactions"
  ON public.crypto_transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
