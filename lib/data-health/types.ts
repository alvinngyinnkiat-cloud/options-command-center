import type { WatchlistScannerHealthStatus } from "@/lib/watchlist/scanner-status";
import type { FmpHealthDiagnostics } from "@/lib/data-health/fmp-status";
import type { TickerSyncDiagnostic } from "@/lib/watchlist/sync-watchlist-data";

export type DataSourceHealthStatus =
  | "healthy"
  | "warning"
  | "failed"
  | "manual_required";

export type DataSourceLogStatus = "success" | "partial" | "failed";

export type DataSourceName =
  | "market_data"
  | "technical_indicators"
  | "watchlist_scheduled_refresh"
  | "us_stock_etf_prices"
  | "sg_stock_prices"
  | "dividend_data"
  | "manual_data"
  | "options_trades"
  | "crypto_manual";

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
  scannerStatus: WatchlistScannerHealthStatus;
  fmpDiagnostics: FmpHealthDiagnostics;
  marketDataTickerDiagnostics: TickerSyncDiagnostic[];
  checkedAt: string;
  supabaseConfigured: boolean;
}
