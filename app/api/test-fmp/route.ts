import { NextResponse } from "next/server";
import { FMP_EOD_ENDPOINT } from "@/lib/watchlist/market-data-provider";
import { runFmpEndpointAudit } from "@/lib/watchlist/fmp-endpoint-audit";
import { runFmpDiagnostics } from "@/lib/watchlist/fmp-diagnostics";

export const dynamic = "force-dynamic";

export async function GET() {
  const [diagnostics, auditRows] = await Promise.all([
    runFmpDiagnostics(),
    runFmpEndpointAudit(),
  ]);

  return NextResponse.json({
    apiReachable: diagnostics.apiReachable,
    apiKeyConfigured: diagnostics.apiKeyConfigured,
    apiKeyStatus: diagnostics.apiKeyConfigured ? "configured" : "missing",
    connectionStatus: diagnostics.status,
    connectionStatusLabel: diagnostics.statusLabel,
    remainingQuota: diagnostics.remainingQuota,
    endpoint: FMP_EOD_ENDPOINT,
    completedCandleTarget: diagnostics.completedCandleTarget,
    probeError: diagnostics.probeError,
    endpointAudit: auditRows.map((row) => ({
      symbol: row.symbol,
      endpoint: row.endpoint,
      urlWithoutApiKey: row.urlWithoutApiKey,
      httpStatus: row.httpStatus,
      contentType: row.contentType,
      rawPreview: row.rawPreview,
      responseKind: row.responseKind,
      parseError: row.parseError,
      candleCount: row.candleCount,
      classification: row.classification,
    })),
    symbols: diagnostics.symbols.map((row) => ({
      symbol: row.symbol,
      candleDate: row.candleDate,
      high: row.high,
      low: row.low,
      averagePrice: row.averagePrice,
      source: row.source,
      error: row.error,
      status: row.status,
    })),
  });
}
