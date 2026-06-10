import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import type { TradeQueueItem } from "./types";

function isRecommended(rec: string): boolean {
  return rec !== "No Trade";
}

function buildReason(row: WatchlistScannerRow): string {
  const ts = row.score?.tradingSystems;
  if (!ts) return "—";
  const parts: string[] = [];
  if (isRecommended(ts.mainSystem.recommendation)) {
    parts.push(`Main: ${ts.mainSystem.reason}`);
  }
  if (isRecommended(ts.emaSystem.recommendation)) {
    parts.push(`20 EMA: ${ts.emaSystem.reason}`);
  }
  return parts.length > 0 ? parts.join(" · ") : ts.confluence.reason;
}

/** V3 queue — Main recommended first, then EMA-only; exclude dual No Trade. */
export function buildTradeQueue(
  rows: WatchlistScannerRow[],
  limit = 25
): TradeQueueItem[] {
  const now = new Date().toISOString();

  const withSystems = rows.filter((row) => {
    const ts = row.score?.tradingSystems;
    if (!ts) return false;
    return (
      isRecommended(ts.mainSystem.recommendation) ||
      isRecommended(ts.emaSystem.recommendation)
    );
  });

  const mainRecommended = withSystems
    .filter((row) =>
      isRecommended(row.score!.tradingSystems!.mainSystem.recommendation)
    )
    .sort(
      (a, b) =>
        b.score!.tradingSystems!.mainSystem.strategyFitScore -
        a.score!.tradingSystems!.mainSystem.strategyFitScore
    );

  const emaOnly = withSystems
    .filter((row) => {
      const ts = row.score!.tradingSystems!;
      return (
        isRecommended(ts.emaSystem.recommendation) &&
        !isRecommended(ts.mainSystem.recommendation)
      );
    })
    .sort(
      (a, b) =>
        b.score!.tradingSystems!.emaSystem.emaScore -
        a.score!.tradingSystems!.emaSystem.emaScore
    );

  const ordered = [...mainRecommended, ...emaOnly].slice(0, limit);

  return ordered.map((row, index) => {
    const ts = row.score!.tradingSystems!;
    return {
      priorityRank: index + 1,
      ticker: row.ticker,
      category: row.category ?? "—",
      mainDecision: ts.mainSystem.recommendation,
      strategyFitScore: ts.mainSystem.strategyFitScore,
      emaDecision: ts.emaSystem.recommendation,
      emaScore: ts.emaSystem.emaScore,
      confluenceStatus: ts.confluence.status,
      reason: buildReason(row),
      lastUpdated: now,
    };
  });
}
