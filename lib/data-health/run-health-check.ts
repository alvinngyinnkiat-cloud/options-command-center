import { runAllAudits } from "@/lib/data-health/audit-sources";
import { formatRelativeAge } from "@/lib/data-health/freshness";
import type {
  DataHealthPageData,
  DataHealthWidgetLine,
  DataSourceHealthReport,
  DataSourceLogView,
} from "@/lib/data-health/types";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
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

function widgetMessage(report: DataSourceHealthReport): string {
  if (report.id === "manual_data") {
    const sr = report.details.find((d) => d.label === "S/R needs weekend review");
    if (sr?.value && sr.value !== "Up to date") return "Needs Review";
    const record = report.details.find((d) => d.label === "Daily portfolio record");
    if (record?.value?.includes("No record")) return "Needs Update";
  }
  if (report.lastSuccessfulUpdate) {
    return formatRelativeAge(report.lastSuccessfulUpdate.slice(0, 10), MOCK_REFERENCE_DATE);
  }
  return report.summary.slice(0, 40);
}

function buildWidgetLines(reports: DataSourceHealthReport[]): DataHealthWidgetLine[] {
  const pick = (id: DataSourceHealthReport["id"], label: string) => {
    const report = reports.find((r) => r.id === id)!;
    return { label, message: widgetMessage(report), status: report.status };
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
    {
      label: "Manual Inputs",
      message: widgetMessage(manual),
      status: manual.status,
    },
    recordLine,
  ];
}

export async function getDataHealthPageData(
  userId: string
): Promise<DataHealthPageData> {
  const [reports, logs] = await Promise.all([
    runAllAudits(userId),
    listDataSourceLogs(userId),
  ]);

  return {
    reports,
    logs: logs.map(mapLog),
    widgetLines: buildWidgetLines(reports),
    checkedAt: new Date().toISOString(),
    supabaseConfigured: isSupabaseConfigured(),
  };
}

export async function getDataHealthWidget(userId: string) {
  const data = await getDataHealthPageData(userId);
  return data.widgetLines;
}
