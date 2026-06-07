export type DataSourceHealthStatus =
  | "healthy"
  | "warning"
  | "failed"
  | "manual_required";

export type DataSourceLogStatus = "success" | "partial" | "failed";

export type DataSourceName =
  | "market_data"
  | "technical_indicators"
  | "auto_watchlist"
  | "dividend_data"
  | "manual_data"
  | "options_trades";

export interface DataSourceDetailRow {
  label: string;
  value: string;
}

export interface DataSourceHealthReport {
  id: DataSourceName;
  title: string;
  status: DataSourceHealthStatus;
  summary: string;
  details: DataSourceDetailRow[];
  lastSuccessfulUpdate: string | null;
  lastFailedUpdate: string | null;
}

export interface DataSourceLogView {
  id: string;
  sourceName: string;
  status: DataSourceLogStatus;
  recordsUpdated: number;
  recordsFailed: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface DataHealthWidgetLine {
  label: string;
  message: string;
  status: DataSourceHealthStatus;
}

export interface DataHealthPageData {
  reports: DataSourceHealthReport[];
  logs: DataSourceLogView[];
  widgetLines: DataHealthWidgetLine[];
  checkedAt: string;
  supabaseConfigured: boolean;
}
