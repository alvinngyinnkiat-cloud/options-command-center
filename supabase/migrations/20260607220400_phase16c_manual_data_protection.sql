-- Phase 16C: Protect manual data from auto-refresh overwrites
-- Application jobs must SET LOCAL app.auto_snapshot = 'true' (etc.) before system writes.

CREATE OR REPLACE FUNCTION public.block_auto_overwrite_manual_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.is_manual_entry IS TRUE
     AND COALESCE(current_setting('app.auto_snapshot', true), '') = 'true' THEN
    RAISE EXCEPTION
      'Cannot auto-overwrite manual daily portfolio snapshot for date %',
      OLD.snapshot_date;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.block_auto_overwrite_manual_snapshot() IS
  'Blocks system auto-snapshot from overwriting rows where is_manual_entry = true.';

DROP TRIGGER IF EXISTS trg_protect_manual_daily_snapshot ON public.daily_portfolio_snapshots;

CREATE TRIGGER trg_protect_manual_daily_snapshot
  BEFORE UPDATE ON public.daily_portfolio_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.block_auto_overwrite_manual_snapshot();

-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.block_auto_overwrite_portfolio_override()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(current_setting('app.auto_portfolio_refresh', true), '') = 'true' THEN
    RAISE EXCEPTION
      'portfolio_overrides is manual only — auto-refresh cannot modify this table';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_portfolio_overrides_insert ON public.portfolio_overrides;
DROP TRIGGER IF EXISTS trg_protect_portfolio_overrides_update ON public.portfolio_overrides;

CREATE TRIGGER trg_protect_portfolio_overrides_insert
  BEFORE INSERT ON public.portfolio_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.block_auto_overwrite_portfolio_override();

CREATE TRIGGER trg_protect_portfolio_overrides_update
  BEFORE UPDATE ON public.portfolio_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.block_auto_overwrite_portfolio_override();

-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.block_api_overwrite_manual_dividend()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.is_manual_override IS TRUE
     AND COALESCE(current_setting('app.dividend_api_sync', true), '') = 'true' THEN
    RAISE EXCEPTION
      'Cannot API-sync overwrite manual dividend override for record %',
      OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_manual_dividend ON public.dividend_records;

CREATE TRIGGER trg_protect_manual_dividend
  BEFORE UPDATE ON public.dividend_records
  FOR EACH ROW
  EXECUTE FUNCTION public.block_api_overwrite_manual_dividend();

-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.block_auto_modify_support_resistance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(current_setting('app.auto_market_refresh', true), '') = 'true' THEN
    RAISE EXCEPTION
      'support_resistance is manual only — auto-refresh cannot INSERT or UPDATE';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_support_resistance_insert ON public.support_resistance;
DROP TRIGGER IF EXISTS trg_protect_support_resistance_update ON public.support_resistance;

CREATE TRIGGER trg_protect_support_resistance_insert
  BEFORE INSERT ON public.support_resistance
  FOR EACH ROW
  EXECUTE FUNCTION public.block_auto_modify_support_resistance();

CREATE TRIGGER trg_protect_support_resistance_update
  BEFORE UPDATE ON public.support_resistance
  FOR EACH ROW
  EXECUTE FUNCTION public.block_auto_modify_support_resistance();

-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.preserve_manual_option_value_on_system_refresh()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.current_value_source = 'manual'
     AND OLD.manual_current_option_value IS NOT NULL
     AND COALESCE(current_setting('app.trade_value_refresh', true), '') = 'true' THEN
    NEW.manual_current_option_value := OLD.manual_current_option_value;
    NEW.current_value_source := OLD.current_value_source;
    NEW.current_value_updated_at := OLD.current_value_updated_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_preserve_manual_option_value ON public.options_trades;

CREATE TRIGGER trg_preserve_manual_option_value
  BEFORE UPDATE ON public.options_trades
  FOR EACH ROW
  EXECUTE FUNCTION public.preserve_manual_option_value_on_system_refresh();

COMMENT ON COLUMN public.options_trades.manual_current_option_value IS
  'Manual broker option value per contract — preserved during system refresh when current_value_source = manual.';
