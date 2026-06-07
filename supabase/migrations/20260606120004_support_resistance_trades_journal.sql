-- Phase 1: Support/resistance (MANUAL ONLY), options trades, trading journal
-- See PROJECT_RULES.md — support/resistance must NEVER be auto-generated.

CREATE TABLE public.support_resistance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  watchlist_id UUID NOT NULL REFERENCES public.watchlist(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  timeframe public.timeframe_type NOT NULL,
  support_1 NUMERIC(12, 4),
  support_2 NUMERIC(12, 4),
  resistance_1 NUMERIC(12, 4),
  resistance_2 NUMERIC(12, 4),
  notes TEXT,
  update_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (watchlist_id, timeframe)
);

COMMENT ON TABLE public.support_resistance IS
  'MANUAL INPUT ONLY — per PROJECT_RULES.md. Levels are user-entered and permanent. Never auto-generated.';
COMMENT ON COLUMN public.support_resistance.support_1 IS 'Primary support level — manually entered.';
COMMENT ON COLUMN public.support_resistance.support_2 IS 'Secondary support level — manually entered.';
COMMENT ON COLUMN public.support_resistance.resistance_1 IS 'Primary resistance level — manually entered.';
COMMENT ON COLUMN public.support_resistance.resistance_2 IS 'Secondary resistance level — manually entered.';

CREATE TABLE public.options_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  watchlist_id UUID NOT NULL REFERENCES public.watchlist(id) ON DELETE RESTRICT,
  ticker TEXT NOT NULL,
  strategy public.strategy_type NOT NULL,
  status public.trade_status NOT NULL DEFAULT 'open',
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE NOT NULL,
  dte INTEGER NOT NULL CHECK (dte >= 0),
  contracts INTEGER NOT NULL DEFAULT 1 CHECK (contracts > 0),
  credit_received NUMERIC(12, 2) NOT NULL DEFAULT 0,
  max_risk NUMERIC(12, 2) NOT NULL DEFAULT 0,
  current_pnl NUMERIC(12, 2) NOT NULL DEFAULT 0,
  pnl_percent NUMERIC(7, 4) NOT NULL DEFAULT 0,
  take_profit_target NUMERIC(5, 2) NOT NULL DEFAULT 75
    CHECK (take_profit_target > 0 AND take_profit_target <= 100),
  stop_loss_target NUMERIC(5, 2) NOT NULL DEFAULT 175
    CHECK (stop_loss_target > 0),
  short_strike_put NUMERIC(12, 4),
  long_strike_put NUMERIC(12, 4),
  short_strike_call NUMERIC(12, 4),
  long_strike_call NUMERIC(12, 4),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.options_trades.watchlist_id IS
  'Direct FK to watchlist entry. ticker is denormalized for immutable historical reporting.';
COMMENT ON COLUMN public.options_trades.ticker IS
  'Denormalized symbol snapshot at trade entry — do not rely on ticker-only joins for analytics.';

CREATE TABLE public.trading_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES public.options_trades(id) ON DELETE SET NULL,
  ticker TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  lesson_learned TEXT,
  tags TEXT[] DEFAULT '{}',
  mood TEXT,
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deferred FK from holdings
ALTER TABLE public.holdings
  ADD CONSTRAINT holdings_linked_trade_id_fkey
  FOREIGN KEY (linked_trade_id) REFERENCES public.options_trades(id) ON DELETE SET NULL;

CREATE TRIGGER set_support_resistance_updated_at
  BEFORE UPDATE ON public.support_resistance
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_options_trades_updated_at
  BEFORE UPDATE ON public.options_trades
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_trading_journal_updated_at
  BEFORE UPDATE ON public.trading_journal
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_support_resistance_user_id ON public.support_resistance(user_id);
CREATE INDEX idx_support_resistance_watchlist_id ON public.support_resistance(watchlist_id);
CREATE INDEX idx_support_resistance_ticker ON public.support_resistance(ticker);
CREATE INDEX idx_support_resistance_user_ticker ON public.support_resistance(user_id, ticker);
CREATE INDEX idx_support_resistance_update_date ON public.support_resistance(update_date DESC);

CREATE INDEX idx_options_trades_user_id ON public.options_trades(user_id);
CREATE INDEX idx_options_trades_watchlist_id ON public.options_trades(watchlist_id);
CREATE INDEX idx_options_trades_ticker ON public.options_trades(ticker);
CREATE INDEX idx_options_trades_status ON public.options_trades(status);
CREATE INDEX idx_options_trades_user_status ON public.options_trades(user_id, status);
CREATE INDEX idx_options_trades_expiration ON public.options_trades(expiration_date);

CREATE INDEX idx_trading_journal_user_id ON public.trading_journal(user_id);
CREATE INDEX idx_trading_journal_trade_id ON public.trading_journal(trade_id);
CREATE INDEX idx_trading_journal_ticker ON public.trading_journal(ticker);
CREATE INDEX idx_trading_journal_entry_date ON public.trading_journal(entry_date DESC);
