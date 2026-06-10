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
import { tradingSystemToLegacyLabel } from "@/lib/watchlist/trading-systems/legacy-bridge";

function sortKey(row: WatchlistScannerRow, status: TradeQueueStatus): number {
  const ts = row.score?.tradingSystems;
  const strategyFitScore =
    ts?.mainSystem.strategyFitScore ?? row.score?.totalScore ?? 0;
  const confluence = ts?.confluence.score ?? 0;
  const emaScore = ts?.emaSystem.emaScore ?? 0;
  const statusPri = status === "Ready" ? 10 : status === "Waiting" ? 5 : 0;

  return (
    strategyFitScore * 1_000_000 +
    confluence * 1_000 +
    emaScore * 10 +
    statusPri
  );
}

function resolveQueueStatus(input: {
  row: WatchlistScannerRow;
  openTrades: EnrichedTrade[];
  liquidityBase: CapitalLiquidityBase;
  marketCondition: MarketConditionResult;
}): { status: TradeQueueStatus; warning: string | null } {
  const { row, openTrades, liquidityBase, marketCondition } = input;
  const score = row.score;
  const ts = score?.tradingSystems;
  const mainRec = ts?.mainSystem.recommendation ?? "No Trade";
  const strategy = tradingSystemToLegacyLabel(mainRec);
  const zone = row.averagePricePosition.zone;
  const confluence = ts?.confluence.score ?? 0;

  if (mainRec === "No Trade" && confluence < 7) {
    return {
      status: "No Trade",
      warning: ts?.mainSystem.reason ?? score?.recommendation.primaryReason ?? null,
    };
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

  if (!marketConditionSupportsStrategy(marketCondition.condition, strategy)) {
    return {
      status: "Waiting",
      warning: `Market ${marketCondition.condition} — strategy mismatch`,
    };
  }

  if (mainRec !== "No Trade" && (ts?.mainSystem.strategyFitScore ?? 0) >= 75) {
    return { status: "Ready", warning: ts?.mainSystem.reason ?? null };
  }

  return { status: "Waiting", warning: "Strategy fit below threshold or no trade" };
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
    .filter((r) => {
      const ts = r.score?.tradingSystems;
      if (!ts) return false;
      return (
        ts.mainSystem.recommendation !== "No Trade" ||
        ts.confluence.score >= 7
      );
    })
    .map((row) => {
      const { status, warning } = resolveQueueStatus({
        row,
        openTrades,
        liquidityBase,
        marketCondition,
      });
      const ts = row.score!.tradingSystems;
      const mainRec = ts.mainSystem.recommendation;
      return {
        row,
        status,
        warning,
        sortKey: sortKey(row, status),
        confluence: ts.confluence.score,
        mainScore: ts.mainSystem.strategyFitScore,
        emaScore: ts.emaSystem.emaScore,
        strategy: tradingSystemToLegacyLabel(mainRec),
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, limit);

  return candidates.map((item, index) => ({
    priorityRank: index + 1,
    ticker: item.row.ticker,
    strategy: item.strategy,
    scannerScore: item.mainScore,
    combinedScore: item.confluence,
    action: item.row.score!.recommendation.actionLabel,
    status: item.status,
    reason: item.row.score!.tradingSystems.confluence.reason,
    warning: item.warning,
    lastUpdated: now,
  }));
}
