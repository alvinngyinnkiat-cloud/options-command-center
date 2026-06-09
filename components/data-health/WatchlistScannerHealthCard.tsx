import type { WatchlistScannerHealthStatus } from "@/lib/watchlist/scanner-status";
import { formatSgtAuditTimestamp } from "@/lib/time/singapore-time";
import { DataHealthStatusBadge } from "./DataHealthStatusBadge";

interface WatchlistScannerHealthCardProps {
  status: WatchlistScannerHealthStatus;
}

export function WatchlistScannerHealthCard({
  status,
}: WatchlistScannerHealthCardProps) {
  const ready = status.scannerReady;

  return (
    <section
      className={`rounded-lg border p-4 ${
        ready
          ? "border-profit/40 bg-profit/5"
          : "border-loss/40 bg-loss/5"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-terminal-foreground">
            Watchlist Scanner
          </h2>
          <p className="text-[11px] text-terminal-muted mt-0.5">
            {status.activeTickers} Active Ticker
            {status.activeTickers === 1 ? "" : "s"}
            <br />
            Scheduled Daily Refresh: {status.scheduledRefreshLabel}
            <br />
            Completed Daily Candles Only
          </p>
        </div>
        <DataHealthStatusBadge status={ready ? "healthy" : "failed"} />
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
        <div>
          <dt className="text-terminal-muted">Daily Auto Refresh</dt>
          <dd className="font-mono mt-0.5">{status.scheduledRefreshLabel}</dd>
        </div>
        <div>
          <dt className="text-terminal-muted">Next Refresh</dt>
          <dd className="font-mono mt-0.5">
            {status.nextScheduledRefreshDate}
            <span className="block text-[10px] text-terminal-muted mt-0.5">
              {status.scheduledRefreshLabel}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-terminal-muted">Last Automated Refresh</dt>
          <dd className="font-mono mt-0.5">
            {status.lastAutomatedRefresh ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-terminal-muted">Last Completed Candle</dt>
          <dd className="font-mono mt-0.5">
            {status.completedCandleTarget}
            {status.lastCandleDate &&
              status.lastCandleDate !== status.completedCandleTarget && (
                <span className="text-loss ml-1">
                  (stored {status.lastCandleDate})
                </span>
              )}
          </dd>
        </div>
        <div>
          <dt className="text-terminal-muted">Indicators Updated</dt>
          <dd className="mt-0.5">
            {status.indicatorsUpdated ? (
              <span className="text-profit">
                Yes ({status.tickersWithIndicators}/{status.activeTickers})
              </span>
            ) : (
              <span className="text-loss">No</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-terminal-muted">Scanner Ready</dt>
          <dd className={`mt-0.5 font-medium ${ready ? "text-profit" : "text-loss"}`}>
            {ready ? "Ready" : "Not Ready"}
          </dd>
        </div>
        <div>
          <dt className="text-terminal-muted">Data Source</dt>
          <dd className="mt-0.5">{status.dataSourceSummary}</dd>
        </div>
        <div>
          <dt className="text-terminal-muted">Last Manual Refresh</dt>
          <dd className="font-mono mt-0.5">
            {formatSgtAuditTimestamp(status.lastRefreshTime)}
          </dd>
        </div>
      </dl>

      {!ready && (
        <p className="mt-3 text-[11px] text-terminal-muted">
          {status.unsupportedTickers.length > 0 && (
            <>Unsupported / failed fetch: {status.unsupportedTickers.join(", ")}. </>
          )}
          {status.staleTickers.length > 0 && (
            <>Missing completed candle: {status.staleTickers.join(", ")}. </>
          )}
          {status.missingIndicatorTickers.length > 0 && (
            <>Missing indicators: {status.missingIndicatorTickers.join(", ")}.</>
          )}
          {status.activeTickers === 0 && "No active watchlist tickers."}
        </p>
      )}
    </section>
  );
}
