-- Daily snapshot personal P/L fields for automated end-of-day recording.

ALTER TABLE public.daily_portfolio_snapshots
  ADD COLUMN IF NOT EXISTS total_portfolio_sgd numeric(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_contributions_sgd numeric(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS my_portfolio_pnl_sgd numeric(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS my_return_pct numeric(8, 4) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.daily_portfolio_snapshots.total_portfolio_sgd IS
  'Total portfolio (US/SG + options + crypto + trading cash) at snapshot time.';
COMMENT ON COLUMN public.daily_portfolio_snapshots.total_contributions_sgd IS
  'All-time personal contributions from Monthly Contribution Tracker at snapshot time.';
COMMENT ON COLUMN public.daily_portfolio_snapshots.my_portfolio_pnl_sgd IS
  'My Portfolio Value minus total contributions at snapshot time.';
COMMENT ON COLUMN public.daily_portfolio_snapshots.my_return_pct IS
  'My Portfolio P/L divided by total contributions × 100 at snapshot time.';

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
    total_portfolio_sgd,
    total_contributions_sgd,
    my_portfolio_pnl_sgd,
    my_return_pct,
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
    COALESCE((p_payload->>'total_portfolio_sgd')::numeric(14, 2), 0),
    COALESCE((p_payload->>'total_contributions_sgd')::numeric(14, 2), 0),
    COALESCE((p_payload->>'my_portfolio_pnl_sgd')::numeric(14, 2), 0),
    COALESCE((p_payload->>'my_return_pct')::numeric(8, 4), 0),
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
    total_portfolio_sgd = EXCLUDED.total_portfolio_sgd,
    total_contributions_sgd = EXCLUDED.total_contributions_sgd,
    my_portfolio_pnl_sgd = EXCLUDED.my_portfolio_pnl_sgd,
    my_return_pct = EXCLUDED.my_return_pct,
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
