import type { TickerSyncDiagnostic } from "@/lib/watchlist/sync-watchlist-data";
import { runAllAudits } from "@/lib/data-health/audit-sources";
import { formatRelativeAge } from "@/lib/data-health/freshness";
import type {
  DataHealthPageData,
  DataHealthWidgetLine,
  DataSourceHealthReport,
  DataSourceLogView,
} from "@/lib/data-health/types";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import { getFmpHealthDiagnostics } from "@/lib/data-health/fmp-status";
import { getWatchlistScannerHealthStatus } from "@/lib/watchlist/scanner-status";
import { ensureDefaultWatchlistItems } from "@/lib/watchlist/ensure-default-watchlist";
import { listDataSourceLogs } from "@/lib/supabase/queries/data-source-logs";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

function mapLog(row: Awaited<ReturnType<typeof listDataSourceLogs>>[0]): DataSourceLogView {
  return {
    id: row.id,
    sourceName: row.source_name,
    status: row.status as DataSourceLogView["status"],
    recordsUpdated: row.records_updated,
    recordsFailed: row.records_failed,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

const NO_LOGS_MESSAGE = "No data health logs yet";

function widgetMessage(
  report: DataSourceHealthReport,
  hasLogs: boolean
): string {
  if (report.id === "manual_data") {
    const sr = report.details.find((d) => d.label === "S/R needs weekend review");
    if (sr?.value && sr.value !== "Up to date") return "Needs Review";
    const record = report.details.find((d) => d.label === "Daily portfolio record");
    if (record?.value?.includes("No record")) return "Needs Update";
  }
  if (report.id === "crypto_manual") {
    return "Manual Update";
  }
  if (report.lastSuccessfulUpdate) {
    return formatRelativeAge(report.lastSuccessfulUpdate.slice(0, 10), MOCK_REFERENCE_DATE);
  }
  if (!hasLogs && report.id !== "manual_data" && report.id !== "options_trades") {
    return NO_LOGS_MESSAGE;
  }
  return report.summary.slice(0, 40);
}

function buildWidgetLines(
  reports: DataSourceHealthReport[],
  hasLogs: boolean
): DataHealthWidgetLine[] {
  const pick = (id: DataSourceHealthReport["id"], label: string) => {
    const report = reports.find((r) => r.id === id)!;
    return {
      label,
      message: widgetMessage(report, hasLogs),
      status: report.status,
    };
  };

  const manual = reports.find((r) => r.id === "manual_data")!;
  const recordDetail = manual.details.find(
    (d) => d.label === "Daily portfolio record"
  );
  const recordLine: DataHealthWidgetLine = {
    label: "Portfolio Record",
    message: recordDetail?.value ?? manual.summary,
    status: recordDetail?.value?.includes("No record") ? "warning" : manual.status,
  };

  return [
    pick("market_data", "Market Data"),
    pick("technical_indicators", "Indicators"),
    pick("dividend_data", "Dividends"),
    pick("crypto_manual", "Crypto"),
    {
      label: "Manual Inputs",
      message: widgetMessage(manual, hasLogs),
      status: manual.status,
    },
    recordLine,
  ];
}

export async function getDataHealthPageData(
  userId: string,
  marketDataTickerDiagnostics: TickerSyncDiagnostic[] = []
): Promise<DataHealthPageData> {
  await ensureDefaultWatchlistItems();

  const [reports, logs, scannerStatus, fmpDiagnostics] = await Promise.all([
    runAllAudits(userId),
    listDataSourceLogs(userId),
    getWatchlistScannerHealthStatus(userId),
    getFmpHealthDiagnostics(userId, marketDataTickerDiagnostics),
  ]);

  const hasLogs = logs.length > 0;

  return {
    reports,
    logs: logs.map(mapLog),
    widgetLines: buildWidgetLines(reports, hasLogs),
    scannerStatus,
    fmpDiagnostics,
    marketDataTickerDiagnostics,
    checkedAt: new Date().toISOString(),
    supabaseConfigured: isSupabaseConfigured(),
  };
}

function fallbackWidgetLines(): DataHealthWidgetLine[] {
  return [
    { label: "Market Data", message: NO_LOGS_MESSAGE, status: "warning" },
    { label: "Indicators", message: NO_LOGS_MESSAGE, status: "warning" },
    { label: "Dividends", message: NO_LOGS_MESSAGE, status: "warning" },
    { label: "Crypto", message: "Manual Update", status: "healthy" },
    { label: "Manual Inputs", message: "Manual review required", status: "manual_required" },
    { label: "Portfolio Record", message: NO_LOGS_MESSAGE, status: "warning" },
  ];
}

export async function getDataHealthWidget(userId: string) {
  try {
    const data = await getDataHealthPageData(userId);
    return data.widgetLines;
  } catch {
    return fallbackWidgetLines();
  }
}
