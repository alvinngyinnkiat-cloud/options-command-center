-- Phase 16C: Additional indexes and foreign-key performance

CREATE INDEX IF NOT EXISTS idx_options_trades_client_id
  ON public.options_trades(client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_options_trades_is_client_trade
  ON public.options_trades(user_id, is_client_trade)
  WHERE is_client_trade = TRUE;

CREATE INDEX IF NOT EXISTS idx_options_trades_trade_ownership
  ON public.options_trades(user_id, trade_ownership);

CREATE INDEX IF NOT EXISTS idx_holdings_linked_trade_id
  ON public.holdings(linked_trade_id)
  WHERE linked_trade_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_trade_allocations_client_id
  ON public.client_trade_allocations(client_id);

CREATE INDEX IF NOT EXISTS idx_client_trade_allocations_options_trade_id
  ON public.client_trade_allocations(options_trade_id);

CREATE INDEX IF NOT EXISTS idx_dividend_records_holding_id
  ON public.dividend_records(holding_id)
  WHERE holding_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_market_intelligence_summaries_user_id
  ON public.market_intelligence_summaries(user_id);

CREATE INDEX IF NOT EXISTS idx_market_intelligence_ticker_impacts_document_id
  ON public.market_intelligence_ticker_impacts(document_id)
  WHERE document_id IS NOT NULL;

-- Profit share consistency on client trades
DO $$ BEGIN
  ALTER TABLE public.options_trades
    ADD CONSTRAINT options_trades_profit_share_sum_check
    CHECK (
      is_client_trade = FALSE
      OR (my_profit_share_percent + client_profit_share_percent = 100)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
