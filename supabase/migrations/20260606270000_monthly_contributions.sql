-- Monthly contribution tracker — manual SGD deposits by month

CREATE TABLE public.monthly_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contribution_month INTEGER NOT NULL CHECK (contribution_month BETWEEN 1 AND 12),
  contribution_year INTEGER NOT NULL CHECK (contribution_year >= 2000),
  stock_options_amount_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (stock_options_amount_sgd >= 0),
  crypto_amount_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (crypto_amount_sgd >= 0),
  total_amount_sgd NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_amount_sgd >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, contribution_year, contribution_month)
);

COMMENT ON TABLE public.monthly_contributions IS
  'Manual monthly portfolio contributions in SGD — stock/options and crypto buckets.';
COMMENT ON COLUMN public.monthly_contributions.total_amount_sgd IS
  'stock_options_amount_sgd + crypto_amount_sgd — stored for reporting.';

CREATE TRIGGER set_monthly_contributions_updated_at
  BEFORE UPDATE ON public.monthly_contributions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_monthly_contributions_user_id ON public.monthly_contributions(user_id);
CREATE INDEX idx_monthly_contributions_year_month
  ON public.monthly_contributions(user_id, contribution_year, contribution_month);

ALTER TABLE public.monthly_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own monthly_contributions"
  ON public.monthly_contributions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
