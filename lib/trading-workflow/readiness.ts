import { buildCapitalLiquidityCheck } from "@/lib/risk/capital-liquidity";
import type { CapitalLiquidityBase } from "@/lib/risk/capital-liquidity";
import { getTickerWeekendReviewFlags } from "@/lib/watchlist/analysis-card";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import type { WeekendReviewStatus } from "@/lib/weekend-review/types";
import type { EnrichedTrade } from "@/lib/trades/types";
import { findActiveTradeForTicker } from "./one-trade-per-ticker";
import { marketConditionSupportsStrategy } from "./market-condition";
import { tradingSystemToLegacyLabel } from "@/lib/watchlist/trading-systems/legacy-bridge";
import type { MarketConditionResult } from "./types";
import type {
  FinalRecommendation,
  ReadinessCheckItem,
  ReadinessLabel,
  TradeReadinessResult,
} from "./types";

const CHECK_WEIGHT = 12.5;

export function buildTradeReadiness(input: {
  row: WatchlistScannerRow;
  openTrades: EnrichedTrade[];
  liquidityBase: CapitalLiquidityBase;
  reviewStatus: WeekendReviewStatus;
  marketCondition: MarketConditionResult;
}): TradeReadinessResult {
  const { row, openTrades, liquidityBase, reviewStatus, marketCondition } =
    input;
  const score = row.score;
  const rec = score?.recommendation;
  const ts = score?.tradingSystems;
  const confluence = ts?.confluence.score ?? 0;
  const strategyFitScore =
    ts?.mainSystem.strategyFitScore ?? score?.totalScore ?? 0;
  const mainRec = ts?.mainSystem.recommendation ?? "No Trade";
  const strategy =
    mainRec !== "No Trade"
      ? tradingSystemToLegacyLabel(mainRec)
      : (rec?.recommendedStrategy ?? "No Trade");
  const hypotheticalRisk = score
    ? Math.max(500, (rec?.recommendedStrategy !== "No Trade" ? 2500 : 0))
    : 0;

  const liquidity = buildCapitalLiquidityCheck(liquidityBase, hypotheticalRisk);
  const weekendFlags = getTickerWeekendReviewFlags(row, reviewStatus);
  const activeTrade = findActiveTradeForTicker(openTrades, row.ticker);
  const intel = score?.intelligence;
  const negativeIntel =
    intel &&
    (intel.sentiment === "very_bearish" || intel.sentiment === "bearish") &&
    intel.bearishSignals.length > 0;

  const checks: ReadinessCheckItem[] = [
    {
      id: "scanner",
      label: "Confluence >= 8 or Main Score >= 80",
      passed: strategyFitScore >= 75,
      detail: `Strategy Fit ${strategyFitScore} · Confluence ${confluence}/10`,
    },
    {
      id: "strategy",
      label: "Strategy is not No Trade",
      passed: strategy !== "No Trade",
      detail: strategy,
    },
    {
      id: "weekend_sr",
      label: "S/R updated this weekend",
      passed: weekendFlags.updatedThisWeekend,
      detail: weekendFlags.updatedThisWeekend
        ? "Updated this weekend"
        : "Needs weekend S/R update",
    },
    {
      id: "risk",
      label: "Risk capacity pass",
      passed: liquidity.tradeEligible,
      detail: liquidity.tradeEligible
        ? "Within risk limits"
        : "Exceeds risk capacity",
    },
    {
      id: "liquidity",
      label: "Cash liquidity pass",
      passed: liquidity.emergencyBuffer >= 0 && liquidity.canCloseAllPositions,
      detail:
        liquidity.emergencyBuffer >= 0
          ? "Liquidity buffer OK"
          : "Insufficient liquidity buffer",
    },
    {
      id: "one_ticker",
      label: "No active trade on ticker",
      passed: !activeTrade,
      detail: activeTrade
        ? `Active ${activeTrade.strategyLabel} exists`
        : "Clear",
    },
    {
      id: "market_align",
      label: "Market condition supports strategy",
      passed:
        strategy === "No Trade" ||
        marketConditionSupportsStrategy(
          marketCondition.condition,
          strategy
        ),
      detail: `${marketCondition.condition} market · ${strategy}`,
    },
    {
      id: "intel",
      label: "No major negative intelligence warning",
      passed: !negativeIntel,
      detail: negativeIntel
        ? intel?.bearishSignals[0] ?? "Bearish intelligence"
        : "No negative intel flag",
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const readinessScore = Math.round(passedCount * CHECK_WEIGHT);
  const label = readinessLabel(readinessScore);
  const finalRecommendation = finalRecommendationFromChecks(checks, label);

  return {
    ticker: row.ticker,
    score: readinessScore,
    label,
    checks,
    finalRecommendation,
  };
}

function readinessLabel(score: number): ReadinessLabel {
  if (score >= 90) return "Ready To Trade";
  if (score >= 75) return "Strong But Review";
  if (score >= 60) return "Watch";
  return "Do Not Trade";
}

function finalRecommendationFromChecks(
  checks: ReadinessCheckItem[],
  label: ReadinessLabel
): FinalRecommendation {
  const byId = Object.fromEntries(checks.map((c) => [c.id, c.passed]));
  if (!byId.weekend_sr) return "Update Support/Resistance First";
  if (!byId.risk) return "Review Risk First";
  if (!byId.liquidity) return "Review Liquidity First";
  if (!byId.one_ticker || !byId.strategy || !byId.scanner) return "Do Not Trade";
  if (!byId.market_align || !byId.intel) return "Wait";
  if (label === "Ready To Trade") return "Ready To Trade";
  if (label === "Strong But Review") return "Wait";
  return "Do Not Trade";
}

export function buildReadinessForRows(
  rows: WatchlistScannerRow[],
  context: {
    openTrades: EnrichedTrade[];
    liquidityBase: CapitalLiquidityBase;
    reviewStatus: WeekendReviewStatus;
    marketCondition: MarketConditionResult;
  }
): TradeReadinessResult[] {
  return rows
    .filter((r) => r.score)
    .map((row) => buildTradeReadiness({ row, ...context }))
    .sort((a, b) => b.score - a.score);
}
