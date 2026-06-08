-- Phase 16E: Explicit RLS policies + system snapshot upsert RPC for daily_portfolio_snapshots.
-- RLS requires auth.uid() = user_id. SUPABASE_DEV_USER_ID in the app does NOT set auth.uid().

DROP POLICY IF EXISTS "Users manage own daily_portfolio_snapshots" ON public.daily_portfolio_snapshots;

CREATE POLICY "daily_portfolio_snapshots_select_own"
  ON public.daily_portfolio_snapshots
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "daily_portfolio_snapshots_insert_own"
  ON public.daily_portfolio_snapshots
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "daily_portfolio_snapshots_update_own"
  ON public.daily_portfolio_snapshots
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "daily_portfolio_snapshots_delete_own"
  ON public.daily_portfolio_snapshots
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

COMMENT ON POLICY "daily_portfolio_snapshots_select_own" ON public.daily_portfolio_snapshots IS
  'Authenticated users read own snapshot history (user_id = auth.uid()).';
COMMENT ON POLICY "daily_portfolio_snapshots_insert_own" ON public.daily_portfolio_snapshots IS
  'Authenticated users insert own snapshots only.';
COMMENT ON POLICY "daily_portfolio_snapshots_update_own" ON public.daily_portfolio_snapshots IS
  'Authenticated users update own snapshots; manual-entry protection enforced by trigger.';
COMMENT ON POLICY "daily_portfolio_snapshots_delete_own" ON public.daily_portfolio_snapshots IS
  'Authenticated users delete own snapshots; manual deletes require auth or user-initiated RPC.';

-- System auto-snapshot upsert (dashboard refresh). SECURITY DEFINER but enforces auth.uid() = user_id.
CREATE OR REPLACE FUNCTION public.upsert_system_daily_portfolio_snapshot(p_payload jsonb)
RETURNS public.daily_portfolio_snapshots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user_id uuid := (p_payload->>'user_id')::uuid;
  v_snapshot_date date := (p_payload->>'snapshot_date')::date;
  v_existing public.daily_portfolio_snapshots;
  v_result public.daily_portfolio_snapshots;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated — sign in to save portfolio snapshots';
  END IF;

  IF v_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Not authorized to save portfolio snapshot for another user';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.daily_portfolio_snapshots
  WHERE user_id = v_user_id
    AND snapshot_date = v_snapshot_date;

  IF FOUND AND v_existing.is_manual_entry IS TRUE THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.daily_portfolio_snapshots (
    id,
    user_id,
    snapshot_date,
    portfolio_value_sgd,
    stock_options_value_sgd,
    crypto_value_sgd,
    usd_cash,
    sgd_cash,
    usd_cash_sgd_equivalent,
    crypto_cash_sgd,
    us_etf_value_sgd,
    us_stock_value_sgd,
    sg_stock_value_sgd,
    current_options_value_sgd,
    open_risk,
    available_risk_capacity,
    personal_unrealized_pnl,
    personal_realized_pnl,
    client_pnl,
    client_initial_capital_sgd,
    client_current_value_sgd,
    portfolio_health_score,
    notes,
    is_manual_entry,
    entered_by,
    created_at,
    updated_at
  )
  VALUES (
    COALESCE((p_payload->>'id')::uuid, gen_random_uuid()),
    v_user_id,
    v_snapshot_date,
    (p_payload->>'portfolio_value_sgd')::numeric(14, 2),
    COALESCE((p_payload->>'stock_options_value_sgd')::numeric(14, 2), 0),
    COALESCE((p_payload->>'crypto_value_sgd')::numeric(14, 2), 0),
    COALESCE((p_payload->>'usd_cash')::numeric(14, 2), 0),
    COALESCE((p_payload->>'sgd_cash')::numeric(14, 2), 0),
    COALESCE((p_payload->>'usd_cash_sgd_equivalent')::numeric(14, 2), 0),
    COALESCE((p_payload->>'crypto_cash_sgd')::numeric(14, 2), 0),
    COALESCE((p_payload->>'us_etf_value_sgd')::numeric(14, 2), 0),
    COALESCE((p_payload->>'us_stock_value_sgd')::numeric(14, 2), 0),
    COALESCE((p_payload->>'sg_stock_value_sgd')::numeric(14, 2), 0),
    COALESCE((p_payload->>'current_options_value_sgd')::numeric(14, 2), 0),
    COALESCE((p_payload->>'open_risk')::numeric(14, 2), 0),
    COALESCE((p_payload->>'available_risk_capacity')::numeric(14, 2), 0),
    COALESCE((p_payload->>'personal_unrealized_pnl')::numeric(14, 2), 0),
    COALESCE((p_payload->>'personal_realized_pnl')::numeric(14, 2), 0),
    COALESCE((p_payload->>'client_pnl')::numeric(14, 2), 0),
    COALESCE((p_payload->>'client_initial_capital_sgd')::numeric(14, 2), 0),
    COALESCE((p_payload->>'client_current_value_sgd')::numeric(14, 2), 0),
    NULLIF(p_payload->>'portfolio_health_score', '')::numeric(5, 2),
    COALESCE(NULLIF(p_payload->>'notes', ''), v_existing.notes),
    FALSE,
    'system'::public.snapshot_entry_source,
    COALESCE((p_payload->>'created_at')::timestamptz, v_existing.created_at, now()),
    now()
  )
  ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
    portfolio_value_sgd = EXCLUDED.portfolio_value_sgd,
    stock_options_value_sgd = EXCLUDED.stock_options_value_sgd,
    crypto_value_sgd = EXCLUDED.crypto_value_sgd,
    usd_cash = EXCLUDED.usd_cash,
    sgd_cash = EXCLUDED.sgd_cash,
    usd_cash_sgd_equivalent = EXCLUDED.usd_cash_sgd_equivalent,
    crypto_cash_sgd = EXCLUDED.crypto_cash_sgd,
    us_etf_value_sgd = EXCLUDED.us_etf_value_sgd,
    us_stock_value_sgd = EXCLUDED.us_stock_value_sgd,
    sg_stock_value_sgd = EXCLUDED.sg_stock_value_sgd,
    current_options_value_sgd = EXCLUDED.current_options_value_sgd,
    open_risk = EXCLUDED.open_risk,
    available_risk_capacity = EXCLUDED.available_risk_capacity,
    personal_unrealized_pnl = EXCLUDED.personal_unrealized_pnl,
    personal_realized_pnl = EXCLUDED.personal_realized_pnl,
    client_pnl = EXCLUDED.client_pnl,
    client_initial_capital_sgd = EXCLUDED.client_initial_capital_sgd,
    client_current_value_sgd = EXCLUDED.client_current_value_sgd,
    portfolio_health_score = EXCLUDED.portfolio_health_score,
    notes = EXCLUDED.notes,
    is_manual_entry = FALSE,
    entered_by = 'system'::public.snapshot_entry_source,
    updated_at = now()
  WHERE daily_portfolio_snapshots.is_manual_entry IS NOT TRUE
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_system_daily_portfolio_snapshot(jsonb) TO authenticated;

COMMENT ON FUNCTION public.upsert_system_daily_portfolio_snapshot(jsonb) IS
  'Auto-refreshed daily snapshot from dashboard metrics. Requires auth.uid() = user_id. Skips manual entries.';
