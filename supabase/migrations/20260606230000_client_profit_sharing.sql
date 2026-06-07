-- Client Profit Sharing — separate from portfolio accounting

CREATE TABLE public.profit_sharing_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  capital_contributed NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (capital_contributed >= 0),
  client_share_pct NUMERIC(5, 2) NOT NULL DEFAULT 40 CHECK (client_share_pct >= 0 AND client_share_pct <= 100),
  my_share_pct NUMERIC(5, 2) NOT NULL DEFAULT 60 CHECK (my_share_pct >= 0 AND my_share_pct <= 100),
  total_paid_to_client NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_paid_to_client >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profit_sharing_clients_share_sum CHECK (client_share_pct + my_share_pct = 100)
);

CREATE TABLE public.profit_sharing_trade_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profit_sharing_clients(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL,
  included_in_pool BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, trade_id)
);

COMMENT ON TABLE public.profit_sharing_clients IS
  'Client profit-sharing profiles — does not affect portfolio value or net worth.';
COMMENT ON TABLE public.profit_sharing_trade_allocations IS
  'Per-trade inclusion in client pool — references options_trades by id only.';

CREATE TRIGGER set_profit_sharing_clients_updated_at
  BEFORE UPDATE ON public.profit_sharing_clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_profit_sharing_trade_allocations_updated_at
  BEFORE UPDATE ON public.profit_sharing_trade_allocations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_profit_sharing_clients_user_id ON public.profit_sharing_clients(user_id);
CREATE INDEX idx_profit_sharing_allocations_user_id ON public.profit_sharing_trade_allocations(user_id);
CREATE INDEX idx_profit_sharing_allocations_trade_id ON public.profit_sharing_trade_allocations(trade_id);

ALTER TABLE public.profit_sharing_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_sharing_trade_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profit_sharing_clients"
  ON public.profit_sharing_clients FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own profit_sharing_trade_allocations"
  ON public.profit_sharing_trade_allocations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
