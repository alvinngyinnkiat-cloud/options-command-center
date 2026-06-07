-- Phase 16C.4: Supabase advisor warning cleanup

-- ---------------------------------------------------------------------------
-- 1. Function search_path hardening
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated_user_request()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.role() = 'authenticated' AND (SELECT auth.uid()) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_user_initiated()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(current_setting('app.user_initiated', true), '') = 'true';
$$;

CREATE OR REPLACE FUNCTION public.protect_portfolio_overrides_manual()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_authenticated_user_request() AND NOT public.is_user_initiated() THEN
    RAISE EXCEPTION
      'portfolio_overrides is manual only — blocked for automated/system requests';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_support_resistance_manual()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_authenticated_user_request() AND NOT public.is_user_initiated() THEN
    RAISE EXCEPTION
      'support_resistance is manual only — blocked for automated/system requests';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_manual_daily_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_manual_entry IS TRUE
       AND NOT public.is_authenticated_user_request()
       AND NOT public.is_user_initiated() THEN
      RAISE EXCEPTION
        'Cannot delete manual daily portfolio snapshot for date % without user action',
        OLD.snapshot_date;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.is_manual_entry IS TRUE THEN
    IF NOT public.is_user_initiated() THEN
      RAISE EXCEPTION
        'Cannot auto-overwrite manual daily portfolio snapshot for date %',
        OLD.snapshot_date;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_manual_dividend_override()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_manual_override IS TRUE THEN
    IF NOT public.is_authenticated_user_request() AND NOT public.is_user_initiated() THEN
      RAISE EXCEPTION
        'Cannot overwrite manual dividend override for record %',
        OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.preserve_manual_option_value_on_refresh()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.current_value_source = 'manual'
     AND OLD.manual_current_option_value IS NOT NULL
     AND NOT public.is_authenticated_user_request()
     AND NOT public.is_user_initiated() THEN
    NEW.manual_current_option_value := OLD.manual_current_option_value;
    NEW.current_value_source := OLD.current_value_source;
    NEW.current_value_updated_at := OLD.current_value_updated_at;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Restrict SECURITY DEFINER RPC execution to authenticated users
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.upsert_manual_daily_portfolio_snapshot(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_manual_daily_portfolio_snapshot(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.upsert_manual_daily_portfolio_snapshot(jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.is_authenticated_user_request() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_authenticated_user_request() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_authenticated_user_request() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Drop duplicate legacy index
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS public.idx_profit_sharing_allocations_trade_id;

-- ---------------------------------------------------------------------------
-- 4. RLS initplan optimization — (select auth.uid()) pattern
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users manage own portfolio_snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Users manage own portfolio_snapshots"
  ON public.portfolio_snapshots FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own holdings" ON public.holdings;
CREATE POLICY "Users manage own holdings"
  ON public.holdings FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own financial_goals" ON public.financial_goals;
CREATE POLICY "Users manage own financial_goals"
  ON public.financial_goals FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own watchlist" ON public.watchlist;
CREATE POLICY "Users manage own watchlist"
  ON public.watchlist FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own market_data via watchlist" ON public.market_data;
CREATE POLICY "Users manage own market_data via watchlist"
  ON public.market_data FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.watchlist w
      WHERE w.id = market_data.watchlist_id
        AND w.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.watchlist w
      WHERE w.id = market_data.watchlist_id
        AND w.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users manage own risk_settings" ON public.risk_settings;
CREATE POLICY "Users manage own risk_settings"
  ON public.risk_settings FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own alerts" ON public.alerts;
CREATE POLICY "Users manage own alerts"
  ON public.alerts FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own reports" ON public.reports;
CREATE POLICY "Users manage own reports"
  ON public.reports FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own weekly_market_updates" ON public.weekly_market_updates;
CREATE POLICY "Users manage own weekly_market_updates"
  ON public.weekly_market_updates FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own scanner_scores" ON public.scanner_scores;
CREATE POLICY "Users manage own scanner_scores"
  ON public.scanner_scores FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own portfolio_overrides" ON public.portfolio_overrides;
CREATE POLICY "Users manage own portfolio_overrides"
  ON public.portfolio_overrides FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own crypto_holdings" ON public.crypto_holdings;
CREATE POLICY "Users manage own crypto_holdings"
  ON public.crypto_holdings FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own stock_etf_holdings" ON public.stock_etf_holdings;
CREATE POLICY "Users manage own stock_etf_holdings"
  ON public.stock_etf_holdings FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own auto_watchlist_results" ON public.auto_watchlist_results;
CREATE POLICY "Users manage own auto_watchlist_results"
  ON public.auto_watchlist_results FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own profit_sharing_clients" ON public.client_profiles;
CREATE POLICY "Users manage own profit_sharing_clients"
  ON public.client_profiles FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own market_intelligence_documents" ON public.market_intelligence_documents;
CREATE POLICY "Users manage own market_intelligence_documents"
  ON public.market_intelligence_documents FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own monthly_contributions" ON public.monthly_contributions;
CREATE POLICY "Users manage own monthly_contributions"
  ON public.monthly_contributions FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own daily_portfolio_snapshots" ON public.daily_portfolio_snapshots;
CREATE POLICY "Users manage own daily_portfolio_snapshots"
  ON public.daily_portfolio_snapshots FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own data source logs" ON public.data_source_logs;
CREATE POLICY "Users manage own data source logs"
  ON public.data_source_logs FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own user_settings" ON public.user_settings;
CREATE POLICY "Users manage own user_settings"
  ON public.user_settings FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own portfolio_milestone_thresholds" ON public.portfolio_milestone_thresholds;
CREATE POLICY "Users manage own portfolio_milestone_thresholds"
  ON public.portfolio_milestone_thresholds FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own auto_watchlist_runs" ON public.auto_watchlist_runs;
CREATE POLICY "Users manage own auto_watchlist_runs"
  ON public.auto_watchlist_runs FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own import_export_logs" ON public.import_export_logs;
CREATE POLICY "Users manage own import_export_logs"
  ON public.import_export_logs FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own technical_indicators via watchlist" ON public.technical_indicators;
CREATE POLICY "Users manage own technical_indicators via watchlist"
  ON public.technical_indicators FOR ALL
  USING (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.watchlist w
      WHERE w.id = technical_indicators.watchlist_id
        AND w.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.watchlist w
      WHERE w.id = technical_indicators.watchlist_id
        AND w.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users manage own dividend_records" ON public.dividend_records;
CREATE POLICY "Users manage own dividend_records"
  ON public.dividend_records FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (
      holding_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.stock_etf_holdings h
        WHERE h.id = dividend_records.holding_id
          AND h.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users manage own client_trade_allocations" ON public.client_trade_allocations;
CREATE POLICY "Users manage own client_trade_allocations"
  ON public.client_trade_allocations FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.client_profiles c
      WHERE c.id = client_trade_allocations.client_id
        AND c.user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.options_trades t
      WHERE t.id = client_trade_allocations.options_trade_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users manage own financial_goal_changes" ON public.financial_goal_changes;
CREATE POLICY "Users manage own financial_goal_changes"
  ON public.financial_goal_changes FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.financial_goals g
      WHERE g.id = financial_goal_changes.goal_id
        AND g.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users manage own trading_journal" ON public.trading_journal;
CREATE POLICY "Users manage own trading_journal"
  ON public.trading_journal FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (
      trade_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.options_trades t
        WHERE t.id = trading_journal.trade_id
          AND t.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users manage own market_intelligence_summaries" ON public.market_intelligence_summaries;
CREATE POLICY "Users manage own market_intelligence_summaries"
  ON public.market_intelligence_summaries FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.market_intelligence_documents d
      WHERE d.id = market_intelligence_summaries.document_id
        AND d.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users manage own market_intelligence_ticker_impacts" ON public.market_intelligence_ticker_impacts;
CREATE POLICY "Users manage own market_intelligence_ticker_impacts"
  ON public.market_intelligence_ticker_impacts FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (
      document_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.market_intelligence_documents d
        WHERE d.id = market_intelligence_ticker_impacts.document_id
          AND d.user_id = (SELECT auth.uid())
      )
    )
    AND (
      watchlist_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.watchlist w
        WHERE w.id = market_intelligence_ticker_impacts.watchlist_id
          AND w.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users manage own options_trades" ON public.options_trades;
CREATE POLICY "Users manage own options_trades"
  ON public.options_trades FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.watchlist w
      WHERE w.id = options_trades.watchlist_id
        AND w.user_id = (SELECT auth.uid())
    )
    AND (
      client_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.client_profiles c
        WHERE c.id = options_trades.client_id
          AND c.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users manage own support_resistance" ON public.support_resistance;
CREATE POLICY "Users manage own support_resistance"
  ON public.support_resistance FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.watchlist w
      WHERE w.id = support_resistance.watchlist_id
        AND w.user_id = (SELECT auth.uid())
    )
  );
