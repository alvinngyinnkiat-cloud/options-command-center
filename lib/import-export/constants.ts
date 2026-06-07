import type { CsvExportEntity, ImportEntityType } from "./types";

export const BACKUP_VERSION = 1 as const;

export const PORTFOLIO_HOLDINGS_HEADERS = [
  "Ticker",
  "Asset Type",
  "Currency",
  "Shares",
  "Cost Basis",
  "Current Value",
] as const;

export const OPTIONS_TRADES_HEADERS = [
  "Underlying",
  "Strategy",
  "Entry Date",
  "Expiry Date",
  "Contracts",
  "Strikes",
  "Premium",
  "Max Risk",
  "Status",
] as const;

export const CRYPTO_HEADERS = [
  "Ticker",
  "Invested Amount SGD",
  "Current Value SGD",
] as const;

export const WATCHLIST_HEADERS = [
  "Ticker",
  "Support1",
  "Support2",
  "Resistance1",
  "Resistance2",
  "Notes",
] as const;

export const IMPORT_ENTITY_LABELS: Record<ImportEntityType, string> = {
  portfolio_holdings: "Portfolio Holdings",
  options_trades: "Options Trades",
  crypto: "Crypto Holdings",
  watchlist: "Watchlist",
};

export const CSV_EXPORT_LABELS: Record<CsvExportEntity, string> = {
  portfolio_holdings: "Portfolio Holdings",
  options_trades: "Options Trades",
  crypto: "Crypto Holdings",
  watchlist: "Watchlist",
  scanner_results: "Scanner Results",
  trading_journal: "Trading Journal",
  risk_dashboard: "Risk Dashboard",
  reports: "Reports",
};

export const PDF_REPORT_LABELS = {
  weekend_market_review: "Weekend Market Review",
  portfolio_report: "Portfolio Report",
  trading_performance: "Trading Performance",
  risk_report: "Risk Report",
} as const;
