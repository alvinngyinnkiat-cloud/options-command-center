-- Phase 1: Risk settings, alerts, and reports
-- Defaults align with PROJECT_RULES.md §5–8

CREATE TABLE public.risk_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  take_profit_percent NUMERIC(5, 2) NOT NULL DEFAULT 75
    CHECK (take_profit_percent > 0 AND take_profit_percent <= 100),
  stop_loss_percent NUMERIC(5, 2) NOT NULL DEFAULT 175
    CHECK (stop_loss_percent > 0),
  max_options_allocation_percent NUMERIC(5, 2) NOT NULL DEFAULT 75
    CHECK (max_options_allocation_percent > 0 AND max_options_allocation_percent <= 100),
  max_risk_per_trade_percent NUMERIC(5, 2) NOT NULL DEFAULT 2.5
    CHECK (max_risk_per_trade_percent > 0 AND max_risk_per_trade_percent <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT,
  alert_type public.alert_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  threshold_value NUMERIC(14, 4),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type public.report_type NOT NULL DEFAULT 'custom',
  title TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  summary TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_risk_settings_updated_at
  BEFORE UPDATE ON public.risk_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_risk_settings_user_id ON public.risk_settings(user_id);

CREATE INDEX idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX idx_alerts_user_active ON public.alerts(user_id, is_active);
CREATE INDEX idx_alerts_user_unread ON public.alerts(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_alerts_ticker ON public.alerts(ticker);
CREATE INDEX idx_alerts_triggered_at ON public.alerts(triggered_at DESC);

CREATE INDEX idx_reports_user_id ON public.reports(user_id);
CREATE INDEX idx_reports_report_type ON public.reports(report_type);
CREATE INDEX idx_reports_generated_at ON public.reports(generated_at DESC);
CREATE INDEX idx_reports_user_generated ON public.reports(user_id, generated_at DESC);
