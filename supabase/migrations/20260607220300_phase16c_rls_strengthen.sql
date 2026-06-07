-- Phase 16C: Strengthened RLS — child FK ownership validation

-- dividend_records.holding_id must belong to same user
DROP POLICY IF EXISTS "Users manage own dividend_records" ON public.dividend_records;

CREATE POLICY "Users manage own dividend_records"
  ON public.dividend_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      holding_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.stock_etf_holdings h
        WHERE h.id = dividend_records.holding_id
          AND h.user_id = auth.uid()
      )
    )
  );

-- client_trade_allocations — validate client and trade ownership
DROP POLICY IF EXISTS "Users manage own profit_sharing_trade_allocations"
  ON public.client_trade_allocations;
DROP POLICY IF EXISTS "Users manage own client_trade_allocations"
  ON public.client_trade_allocations;

CREATE POLICY "Users manage own client_trade_allocations"
  ON public.client_trade_allocations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.client_profiles c
      WHERE c.id = client_trade_allocations.client_id
        AND c.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.options_trades t
      WHERE t.id = client_trade_allocations.options_trade_id
        AND t.user_id = auth.uid()
    )
  );

-- financial_goal_changes — validate goal ownership
DROP POLICY IF EXISTS "Users manage own financial_goal_changes"
  ON public.financial_goal_changes;

CREATE POLICY "Users manage own financial_goal_changes"
  ON public.financial_goal_changes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.financial_goals g
      WHERE g.id = financial_goal_changes.goal_id
        AND g.user_id = auth.uid()
    )
  );

-- trading_journal — validate trade ownership when linked
DROP POLICY IF EXISTS "Users manage own trading_journal"
  ON public.trading_journal;

CREATE POLICY "Users manage own trading_journal"
  ON public.trading_journal FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      trade_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.options_trades t
        WHERE t.id = trading_journal.trade_id
          AND t.user_id = auth.uid()
      )
    )
  );

-- market_intelligence_summaries — validate document ownership
DROP POLICY IF EXISTS "Users manage own market_intelligence_summaries"
  ON public.market_intelligence_summaries;

CREATE POLICY "Users manage own market_intelligence_summaries"
  ON public.market_intelligence_summaries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.market_intelligence_documents d
      WHERE d.id = market_intelligence_summaries.document_id
        AND d.user_id = auth.uid()
    )
  );

-- market_intelligence_ticker_impacts — validate document + watchlist ownership
DROP POLICY IF EXISTS "Users manage own market_intelligence_ticker_impacts"
  ON public.market_intelligence_ticker_impacts;

CREATE POLICY "Users manage own market_intelligence_ticker_impacts"
  ON public.market_intelligence_ticker_impacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      document_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.market_intelligence_documents d
        WHERE d.id = market_intelligence_ticker_impacts.document_id
          AND d.user_id = auth.uid()
      )
    )
    AND (
      watchlist_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.watchlist w
        WHERE w.id = market_intelligence_ticker_impacts.watchlist_id
          AND w.user_id = auth.uid()
      )
    )
  );

-- options_trades — validate client_id belongs to user when set
DROP POLICY IF EXISTS "Users manage own options_trades"
  ON public.options_trades;

CREATE POLICY "Users manage own options_trades"
  ON public.options_trades FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.watchlist w
      WHERE w.id = options_trades.watchlist_id
        AND w.user_id = auth.uid()
    )
    AND (
      client_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.client_profiles c
        WHERE c.id = options_trades.client_id
          AND c.user_id = auth.uid()
      )
    )
  );

-- support_resistance — validate watchlist ownership
DROP POLICY IF EXISTS "Users manage own support_resistance"
  ON public.support_resistance;

CREATE POLICY "Users manage own support_resistance"
  ON public.support_resistance FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.watchlist w
      WHERE w.id = support_resistance.watchlist_id
        AND w.user_id = auth.uid()
    )
  );
