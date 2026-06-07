-- Options Trade ↔ Client Profit Sharing integration

DO $$ BEGIN
  CREATE TYPE public.trade_ownership AS ENUM ('personal', 'client_profit_sharing');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.client_allocation_status AS ENUM ('Open', 'Closed', 'Paid', 'Unpaid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.options_trades
  ADD COLUMN IF NOT EXISTS trade_ownership public.trade_ownership NOT NULL DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS client_id UUID,
  ADD COLUMN IF NOT EXISTS my_profit_share_percent NUMERIC(5, 2) NOT NULL DEFAULT 60
    CHECK (my_profit_share_percent >= 0 AND my_profit_share_percent <= 100),
  ADD COLUMN IF NOT EXISTS client_profit_share_percent NUMERIC(5, 2) NOT NULL DEFAULT 40
    CHECK (client_profit_share_percent >= 0 AND client_profit_share_percent <= 100),
  ADD COLUMN IF NOT EXISTS is_client_trade BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.options_trades.trade_ownership IS
  'personal = full P/L to user; client_profit_sharing = split with client pool';
COMMENT ON COLUMN public.options_trades.is_client_trade IS
  'True when trade participates in client profit sharing — does not affect portfolio accounting';

-- Rename legacy profit-sharing tables to client_* schema
ALTER TABLE IF EXISTS public.profit_sharing_clients RENAME TO client_profiles;
ALTER TABLE IF EXISTS public.profit_sharing_trade_allocations RENAME TO client_trade_allocations;

DO $$ BEGIN
  ALTER TABLE public.client_profiles RENAME COLUMN client_share_pct TO client_share_percent;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.client_profiles RENAME COLUMN my_share_pct TO my_share_percent;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.client_trade_allocations RENAME COLUMN trade_id TO options_trade_id;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

ALTER TABLE public.client_trade_allocations
  ADD COLUMN IF NOT EXISTS trade_profit_loss NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS my_share_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_share_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status public.client_allocation_status NOT NULL DEFAULT 'Open';

ALTER TABLE public.client_trade_allocations
  DROP CONSTRAINT IF EXISTS profit_sharing_trade_allocations_client_id_trade_id_key;

ALTER TABLE public.client_trade_allocations
  DROP CONSTRAINT IF EXISTS client_trade_allocations_client_id_trade_id_key;

DO $$ BEGIN
  ALTER TABLE public.client_trade_allocations
    ADD CONSTRAINT client_trade_allocations_client_trade_unique
    UNIQUE (client_id, options_trade_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.options_trades
    ADD CONSTRAINT options_trades_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.client_profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.client_trade_allocations
    ADD CONSTRAINT client_trade_allocations_options_trade_id_fkey
    FOREIGN KEY (options_trade_id) REFERENCES public.options_trades(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE public.client_profiles IS
  'Client profit-sharing profiles — separate from portfolio value';
COMMENT ON TABLE public.client_trade_allocations IS
  'Per-trade client allocations linked to options_trades';
