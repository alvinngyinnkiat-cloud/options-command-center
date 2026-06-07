-- Phase 16C.2 Issues #6 and #7: Harden manual data protection (default-deny for system jobs).

-- ---------------------------------------------------------------------------
-- Session / role helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_authenticated_user_request()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.role() = 'authenticated' AND auth.uid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_user_initiated()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('app.user_initiated', true), '') = 'true';
$$;

COMMENT ON FUNCTION public.is_authenticated_user_request() IS
  'True when the request runs under an authenticated user JWT (server actions / UI).';
COMMENT ON FUNCTION public.is_user_initiated() IS
  'True when app.user_initiated was set in the current transaction (manual snapshot RPC).';

-- ---------------------------------------------------------------------------
-- portfolio_overrides — manual only (INSERT / UPDATE / DELETE)
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_protect_portfolio_overrides_insert ON public.portfolio_overrides;
DROP TRIGGER IF EXISTS trg_protect_portfolio_overrides_update ON public.portfolio_overrides;
DROP FUNCTION IF EXISTS public.block_auto_overwrite_portfolio_override();

CREATE OR REPLACE FUNCTION public.protect_portfolio_overrides_manual()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_protect_portfolio_overrides_insert
  BEFORE INSERT ON public.portfolio_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_portfolio_overrides_manual();

CREATE TRIGGER trg_protect_portfolio_overrides_update
  BEFORE UPDATE ON public.portfolio_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_portfolio_overrides_manual();

CREATE TRIGGER trg_protect_portfolio_overrides_delete
  BEFORE DELETE ON public.portfolio_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_portfolio_overrides_manual();

-- ---------------------------------------------------------------------------
-- support_resistance — manual only (INSERT / UPDATE / DELETE)
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_protect_support_resistance_insert ON public.support_resistance;
DROP TRIGGER IF EXISTS trg_protect_support_resistance_update ON public.support_resistance;
DROP FUNCTION IF EXISTS public.block_auto_modify_support_resistance();

CREATE OR REPLACE FUNCTION public.protect_support_resistance_manual()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_protect_support_resistance_insert
  BEFORE INSERT ON public.support_resistance
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_support_resistance_manual();

CREATE TRIGGER trg_protect_support_resistance_update
  BEFORE UPDATE ON public.support_resistance
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_support_resistance_manual();

CREATE TRIGGER trg_protect_support_resistance_delete
  BEFORE DELETE ON public.support_resistance
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_support_resistance_manual();

-- ---------------------------------------------------------------------------
-- daily_portfolio_snapshots — protect manual entries from auto-refresh
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_protect_manual_daily_snapshot ON public.daily_portfolio_snapshots;
DROP FUNCTION IF EXISTS public.block_auto_overwrite_manual_snapshot();

CREATE OR REPLACE FUNCTION public.protect_manual_daily_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_protect_manual_daily_snapshot
  BEFORE UPDATE OR DELETE ON public.daily_portfolio_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_manual_daily_snapshot();

-- RPC: user-initiated manual snapshot upsert (sets app.user_initiated in same transaction)
CREATE OR REPLACE FUNCTION public.upsert_manual_daily_portfolio_snapshot(p_payload jsonb)
RETURNS public.daily_portfolio_snapshots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user_id uuid := (p_payload->>'user_id')::uuid;
  v_result public.daily_portfolio_snapshots;
BEGIN
  IF v_uid IS NULL OR v_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Not authorized to save manual portfolio snapshot';
  END IF;

  PERFORM set_config('app.user_initiated', 'true', true);

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
    (p_payload->>'snapshot_date')::date,
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
    NULLIF(p_payload->>'notes', ''),
    TRUE,
    'user'::public.snapshot_entry_source,
    COALESCE((p_payload->>'created_at')::timestamptz, now()),
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
    is_manual_entry = TRUE,
    entered_by = 'user'::public.snapshot_entry_source,
    updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_manual_daily_portfolio_snapshot(jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- dividend_records — protect manual overrides from API/system sync
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_protect_manual_dividend ON public.dividend_records;
DROP FUNCTION IF EXISTS public.block_api_overwrite_manual_dividend();

CREATE OR REPLACE FUNCTION public.protect_manual_dividend_override()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_protect_manual_dividend
  BEFORE UPDATE ON public.dividend_records
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_manual_dividend_override();

-- ---------------------------------------------------------------------------
-- options_trades — preserve manual option values unless user-initiated
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_preserve_manual_option_value ON public.options_trades;
DROP FUNCTION IF EXISTS public.preserve_manual_option_value_on_system_refresh();

CREATE OR REPLACE FUNCTION public.preserve_manual_option_value_on_refresh()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_preserve_manual_option_value
  BEFORE UPDATE ON public.options_trades
  FOR EACH ROW
  EXECUTE FUNCTION public.preserve_manual_option_value_on_refresh();

COMMENT ON FUNCTION public.preserve_manual_option_value_on_refresh() IS
  'Preserves manual option values during system refresh; authenticated user edits are allowed.';
