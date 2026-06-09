import type { FmpHealthDiagnostics } from "@/lib/data-health/fmp-status";
import { formatSgtAuditTimestamp } from "@/lib/time/singapore-time";
import { DataHealthStatusBadge } from "./DataHealthStatusBadge";

interface FmpHealthCardProps {
  diagnostics: FmpHealthDiagnostics;
}

export function FmpHealthCard({ diagnostics }: FmpHealthCardProps) {
  return (
    <section className="rounded-lg border border-terminal-border bg-terminal-elevated/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-terminal-foreground">
            Market Data (FMP + Yahoo)
          </h2>
          <p className="text-[11px] text-terminal-muted mt-0.5">
            FMP first, Yahoo fallback — completed daily candles only
          </p>
        </div>
        <DataHealthStatusBadge status={diagnostics.healthBadge} />
      </div>

      <p className="mt-3 text-xs font-medium">{diagnostics.statusLabel}</p>

      <div className="mt-4 rounded-md border border-terminal-border/60 bg-terminal-elevated/10 p-3">
        <p className="text-[11px] font-medium text-terminal-foreground">
          Market Data Source Summary
        </p>
        <dl className="mt-2 grid gap-2 sm:grid-cols-3 text-xs">
          <div>
            <dt className="text-terminal-muted">FMP Success</dt>
            <dd className="font-mono mt-0.5">{diagnostics.fmpSymbolCount}</dd>
          </div>
          <div>
            <dt className="text-terminal-muted">Yahoo Success</dt>
            <dd className="font-mono mt-0.5">{diagnostics.yahooSymbolCount}</dd>
          </div>
          <div>
            <dt className="text-terminal-muted">Failed</dt>
            <dd className={`font-mono mt-0.5 ${diagnostics.failedSymbolCount > 0 ? "text-loss" : ""}`}>
              {diagnostics.failedSymbolCount}
            </dd>
          </div>
        </dl>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
        <div>
          <dt className="text-terminal-muted">API Key</dt>
          <dd className="mt-0.5">
            {diagnostics.apiKeyConfigured ? "Configured" : "Missing"}
          </dd>
        </div>
        <div>
          <dt className="text-terminal-muted">API Reachable</dt>
          <dd className="mt-0.5">
            {diagnostics.apiReachable ? "Yes" : "No"}
          </dd>
        </div>
        <div>
          <dt className="text-terminal-muted">Remaining Quota</dt>
          <dd className="font-mono mt-0.5">
            {diagnostics.remainingQuota ?? "Not reported by FMP"}
          </dd>
        </div>
        <div>
          <dt className="text-terminal-muted">Active Tickers</dt>
          <dd className="font-mono mt-0.5">{diagnostics.activeTickerCount}</dd>
        </div>
        <div>
          <dt className="text-terminal-muted">FMP Symbols</dt>
          <dd className="font-mono mt-0.5">
            {diagnostics.fmpSymbolCount}
            {diagnostics.fmpSymbols.length > 0 && (
              <span className="text-terminal-muted font-sans ml-1">
                ({diagnostics.fmpSymbols.join(", ")})
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-terminal-muted">Yahoo Symbols</dt>
          <dd className="font-mono mt-0.5">
            {diagnostics.yahooSymbolCount}
            {diagnostics.yahooSymbols.length > 0 && (
              <span className="text-terminal-muted font-sans ml-1">
                ({diagnostics.yahooSymbols.join(", ")})
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-terminal-muted">Tickers Updated</dt>
          <dd className="font-mono mt-0.5">{diagnostics.tickersUpdated}</dd>
        </div>
        <div>
          <dt className="text-terminal-muted">Last Successful Refresh</dt>
          <dd className="font-mono mt-0.5">
            {formatSgtAuditTimestamp(diagnostics.lastSuccessfulRefresh)}
          </dd>
        </div>
        <div>
          <dt className="text-terminal-muted">Latest Completed Candle</dt>
          <dd className="font-mono mt-0.5">
            {diagnostics.latestCompletedCandleDate ?? "—"}
            {diagnostics.latestCompletedCandleDate &&
              diagnostics.latestCompletedCandleDate !==
                diagnostics.completedCandleTarget && (
                <span className="text-loss ml-1">
                  (target {diagnostics.completedCandleTarget})
                </span>
              )}
          </dd>
        </div>
        <div>
          <dt className="text-terminal-muted">Endpoint</dt>
          <dd className="font-mono mt-0.5 text-[10px] break-all">
            {diagnostics.endpoint}
          </dd>
        </div>
      </dl>

      {diagnostics.lastSyncTickerDiagnostics.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-md border border-terminal-border/60">
          <p className="px-3 pt-3 text-[11px] font-medium text-terminal-foreground">
            Last Refresh — Per Ticker
          </p>
          <table className="w-full min-w-[480px] text-xs mt-2">
            <thead className="bg-terminal-elevated/30 border-y border-terminal-border/40 text-terminal-muted">
              <tr className="text-left">
                {["Symbol", "Selected Source", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {diagnostics.lastSyncTickerDiagnostics.map((row) => (
                <tr key={row.symbol} className="border-b border-terminal-border/40">
                  <td className="px-3 py-2 font-mono">{row.symbol}</td>
                  <td className="px-3 py-2 font-mono">
                    {row.selectedSource ?? "—"}
                  </td>
                  <td
                    className={`px-3 py-2 font-medium ${
                      row.status === "success" ? "text-profit" : "text-loss"
                    }`}
                  >
                    {row.status}
                    {row.error && (
                      <span className="block text-[10px] font-normal text-terminal-muted mt-0.5">
                        {row.error}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {diagnostics.failedTickerDetails.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-md border border-loss/30">
          <table className="w-full min-w-[640px] text-xs">
            <thead className="bg-loss/5 border-b border-loss/20 text-terminal-muted">
              <tr className="text-left">
                {["Ticker", "FMP Error", "Yahoo Error", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {diagnostics.failedTickerDetails.map((row) => (
                <tr key={row.ticker} className="border-b border-terminal-border/40">
                  <td className="px-3 py-2 font-mono">{row.ticker}</td>
                  <td className="px-3 py-2 text-loss max-w-[220px]">
                    {row.fmpError ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-loss max-w-[220px]">
                    {row.yahooError ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-loss">{row.finalStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {diagnostics.probeError && (
        <p className="mt-3 text-[11px] text-loss">{diagnostics.probeError}</p>
      )}

      <p className="mt-3 text-[10px] text-terminal-muted">
        Test endpoints: GET /api/test-market-data · GET /api/test-fmp
      </p>
    </section>
  );
}
