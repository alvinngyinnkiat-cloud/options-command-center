import type { DataSource } from "@/lib/portfolio/types";

export type ImportEntityType =
  | "portfolio_holdings"
  | "options_trades"
  | "crypto"
  | "watchlist";

export type CsvExportEntity =
  | "portfolio_holdings"
  | "options_trades"
  | "crypto"
  | "watchlist"
  | "scanner_results"
  | "trading_journal"
  | "risk_dashboard"
  | "reports";

export type PdfReportType =
  | "weekend_market_review"
  | "portfolio_report"
  | "trading_performance"
  | "risk_report";

export type ImportExportTab =
  | "csv_import"
  | "csv_export"
  | "excel_export"
  | "pdf_reports"
  | "backup_restore";

export interface FileDownloadPayload {
  filename: string;
  mimeType: string;
  base64: string;
}

export interface ImportRowError {
  row: number;
  field?: string;
  message: string;
}

export interface ImportPreviewRow<T = Record<string, string>> {
  rowNumber: number;
  data: T;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
  parsed?: unknown;
}

export interface ImportPreviewResult<T = Record<string, string>> {
  entityType: ImportEntityType;
  headers: string[];
  rows: ImportPreviewRow<T>[];
  validCount: number;
  duplicateCount: number;
  errorCount: number;
}

export interface ImportSummary {
  entityType: ImportEntityType;
  imported: number;
  skipped: number;
  errors: ImportRowError[];
}

export interface ImportExportPageData {
  dataSource: DataSource;
  exportCounts: Record<CsvExportEntity, number>;
  lastBackupAt: string | null;
}

export interface FullBackupBundle {
  version: 1;
  exportedAt: string;
  dataSource: DataSource;
  portfolio: unknown;
  watchlists: unknown;
  supportResistance: unknown;
  trades: unknown;
  journal: unknown;
  settings: unknown;
  goals: unknown;
  crypto: unknown;
  stockEtf: unknown;
  scannerResults: unknown;
  weekendReview: unknown;
}
