import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import type {
  WeekendOpportunityEntry,
  WeekendOpportunityLists,
} from "./types";

const TOP_N = 5;

function toEntry(row: WatchlistScannerRow): WeekendOpportunityEntry | null {
  if (!row.score) return null;
  const rec = row.score.recommendation;
  return {
    watchlistId: row.watchlistId,
    ticker: row.ticker,
    totalScore: row.score.totalScore,
    recommendedStrategy: rec.recommendedStrategy,
    action: rec.actionLabel,
    decisionLabel: rec.decisionLabel,
    primaryReason: rec.primaryReason,
    averagePrice: row.market.averagePrice,
  };
}

function topByStrategy(
  rows: WatchlistScannerRow[],
  strategy: string
): WeekendOpportunityEntry[] {
  return rows
    .map(toEntry)
    .filter((e): e is WeekendOpportunityEntry => e != null && e.recommendedStrategy === strategy)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, TOP_N);
}

export function buildWeekendOpportunityLists(
  rows: WatchlistScannerRow[]
): WeekendOpportunityLists {
  const noTrade = rows
    .map(toEntry)
    .filter((e): e is WeekendOpportunityEntry => e != null && e.recommendedStrategy === "No Trade")
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, TOP_N);

  return {
    bullPut: topByStrategy(rows, "Bull Put"),
    bearCall: topByStrategy(rows, "Bear Call"),
    ironCondor: topByStrategy(rows, "Iron Condor"),
    noTrade,
  };
}
