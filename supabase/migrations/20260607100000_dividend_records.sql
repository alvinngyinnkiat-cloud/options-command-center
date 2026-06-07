-- Dividend tracking: payment records with manual override support

CREATE TYPE public.dividend_market AS ENUM ('US', 'SG');

CREATE TYPE public.dividend_category AS ENUM (
  'us_etf',
  'us_stock',
  'sg_stock',
  'sg_reit'
);

CREATE TYPE public.dividend_source AS ENUM ('api', 'manual', 'broker');

CREATE TYPE public.dividend_status AS ENUM ('upcoming', 'received', 'estimated');

CREATE TABLE public.dividend_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  holding_id UUID REFERENCES public.stock_etf_holdings(id) ON DELETE SET NULL,
  ticker TEXT NOT NULL,
  market public.dividend_market NOT NULL,
  category public.dividend_category NOT NULL,
  ex_dividend_date DATE,
  record_date DATE,
  payment_date DATE,
  dividend_per_share NUMERIC(14, 6) NOT NULL DEFAULT 0,
  shares_held NUMERIC(14, 4) NOT NULL DEFAULT 0,
  gross_dividend NUMERIC(14, 2) NOT NULL DEFAULT 0,
  withholding_tax NUMERIC(14, 2) NOT NULL DEFAULT 0,
  net_dividend NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  sgd_equivalent NUMERIC(14, 2) NOT NULL DEFAULT 0,
  fx_rate_to_sgd NUMERIC(12, 6),
  source public.dividend_source NOT NULL DEFAULT 'manual',
  status public.dividend_status NOT NULL DEFAULT 'received',
  is_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  is_received BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  api_reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_dividend_records_updated_at
  BEFORE UPDATE ON public.dividend_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_dividend_records_user_id ON public.dividend_records(user_id);
CREATE INDEX idx_dividend_records_ticker ON public.dividend_records(user_id, ticker);
CREATE INDEX idx_dividend_records_payment_date ON public.dividend_records(user_id, payment_date DESC);
CREATE INDEX idx_dividend_records_status ON public.dividend_records(user_id, status);
CREATE INDEX idx_dividend_records_api_ref ON public.dividend_records(user_id, api_reference_id)
  WHERE api_reference_id IS NOT NULL;

ALTER TABLE public.dividend_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dividend_records"
  ON public.dividend_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.dividend_records IS
  'Dividend payments and calendar events. Manual overrides take priority over API sync.';
