import type { AggregatedTickerIntelligence } from "@/lib/market-intelligence/types";

interface WatchlistImpactTableProps {
  impacts: AggregatedTickerIntelligence[];
}

export function WatchlistImpactTable({ impacts }: WatchlistImpactTableProps) {
  if (impacts.length === 0) {
    return (
      <p className="text-sm text-terminal-muted py-4">
        No watchlist impacts yet — upload documents mentioning watchlist tickers.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[700px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated">
            <th className="px-3 py-2 text-left">Ticker</th>
            <th className="px-3 py-2 text-left">Sentiment</th>
            <th className="px-3 py-2 text-right">Intel Score</th>
            <th className="px-3 py-2 text-left">Sources</th>
            <th className="px-3 py-2 text-left">Rationale</th>
          </tr>
        </thead>
        <tbody>
          {impacts
            .sort((a, b) => b.score - a.score)
            .map((impact) => (
              <tr
                key={impact.ticker}
                className="border-b border-terminal-border/50"
              >
                <td className="px-3 py-2 font-medium">{impact.ticker}</td>
                <td className="px-3 py-2">{impact.sentimentLabel}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {impact.score}
                </td>
                <td className="px-3 py-2">{impact.sourceCount}</td>
                <td className="px-3 py-2 text-terminal-muted">
                  {impact.rationale ?? "—"}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
