import { buildCapitalLiquidityCheck } from "@/lib/risk/capital-liquidity";
import type { CapitalLiquidityBase } from "@/lib/risk/capital-liquidity";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import type { EnrichedTrade } from "@/lib/trades/types";
import { findActiveTradeForTicker } from "./one-trade-per-ticker";
import { marketConditionSupportsStrategy } from "./market-condition";
import type {
  MarketConditionResult,
  TradeQueueItem,
  TradeQueueStatus,
} from "./types";

const ACTION_PRIORITY: Record<string, number> = {
  enter: 4,
  hold: 3,
  watch: 2,
  avoid: 1,
  exit: 0,
};

const DECISION_PRIORITY: Record<string, number> = {
  "Trade Immediately": 4,
  "Strong Candidate": 3,
  Watchlist: 2,
  "No Trade": 1,
};

function resolveQueueStatus(input: {
  row: WatchlistScannerRow;
  openTrades: EnrichedTrade[];
  liquidityBase: CapitalLiquidityBase;
  marketCondition: MarketConditionResult;
}): { status: TradeQueueStatus; warning: string | null } {
  const { row, openTrades, liquidityBase, marketCondition } = input;
  const score = row.score;
  const rec = score?.recommendation;
  const strategy = rec?.recommendedStrategy ?? "No Trade";
  const zone = row.averagePricePosition.zone;

  if (strategy === "No Trade") {
    return { status: "No Trade", warning: rec?.primaryReason ?? null };
  }

  const liquidity = buildCapitalLiquidityCheck(liquidityBase, 2500);
  if (!liquidity.tradeEligible) {
    return {
      status: liquidity.emergencyBuffer < 0 ? "Liquidity Failed" : "Risk Failed",
      warning: "Risk or liquidity check failed",
    };
  }

  if (findActiveTradeForTicker(openTrades, row.ticker)) {
    return { status: "Waiting", warning: "Active trade already on ticker" };
  }

  if (zone === "support") {
    return { status: "Near Support", warning: "Price near manual support" };
  }
  if (zone === "resistance") {
    return { status: "Near Resistance", warning: "Price near manual resistance" };
  }

  if (
    !marketConditionSupportsStrategy(marketCondition.condition, strategy)
  ) {
    return {
      status: "Waiting",
      warning: `Market ${marketCondition.condition} — strategy mismatch`,
    };
  }

  const combined = score?.combinedScore ?? score?.totalScore ?? 0;
  if (combined >= 80) {
    return { status: "Ready", warning: rec?.warningNotes?.[0] ?? null };
  }

  return { status: "Waiting", warning: "Score below 80 threshold" };
}

function sortKey(row: WatchlistScannerRow, status: TradeQueueStatus): number {
  const score = row.score;
  const rec = score?.recommendation;
  const combined = score?.combinedScore ?? score?.totalScore ?? 0;
  const actionPri = ACTION_PRIORITY[String(rec?.action ?? "avoid")] ?? 0;
  const decisionPri = DECISION_PRIORITY[rec?.decisionLabel ?? "No Trade"] ?? 0;
  const statusPri = status === "Ready" ? 10 : status === "Waiting" ? 5 : 0;

  return (
    combined * 1000 +
    decisionPri * 100 +
    actionPri * 10 +
    statusPri
  );
}

export function buildTradeQueue(
  rows: WatchlistScannerRow[],
  openTrades: EnrichedTrade[],
  liquidityBase: CapitalLiquidityBase,
  marketCondition: MarketConditionResult,
  limit = 5
): TradeQueueItem[] {
  const now = new Date().toISOString();

  const candidates = rows
    .filter((r) => r.score && r.score.recommendation.recommendedStrategy !== "No Trade")
    .map((row) => {
      const { status, warning } = resolveQueueStatus({
        row,
        openTrades,
        liquidityBase,
        marketCondition,
      });
      const score = row.score!;
      const rec = score.recommendation;
      return {
        row,
        status,
        warning,
        sortKey: sortKey(row, status),
        combined: score.combinedScore ?? score.totalScore,
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, limit);

  return candidates.map((item, index) => ({
    priorityRank: index + 1,
    ticker: item.row.ticker,
    strategy: item.row.score!.recommendation.recommendedStrategy,
    scannerScore: item.row.score!.totalScore,
    combinedScore: item.combined,
    action: item.row.score!.recommendation.actionLabel,
    status: item.status,
    reason: item.row.score!.recommendation.primaryReason,
    warning: item.warning,
    lastUpdated: now,
  }));
}
