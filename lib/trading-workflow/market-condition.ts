import type { AggregatedTickerIntelligence } from "@/lib/market-intelligence/types";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import type { MarketConditionResult, MarketConditionType } from "./types";

const BENCHMARKS = ["SPY", "QQQ", "IWM", "XSP"] as const;

function trendBias(row: WatchlistScannerRow): "bullish" | "bearish" | "neutral" {
  const score = row.score;
  if (!score) return "neutral";
  const strategy = score.candidateStrategy;
  if (strategy === "bull_put_spread" && score.trend.passed) return "bullish";
  if (strategy === "bear_call_spread" && score.trend.passed) return "bearish";
  if (strategy === "iron_condor") return "neutral";
  if (score.trend.passed) {
    if (score.trend.reason.toLowerCase().includes("bull")) return "bullish";
    if (score.trend.reason.toLowerCase().includes("bear")) return "bearish";
  }
  return "neutral";
}

function avgStochastic(rows: WatchlistScannerRow[]): number {
  const vals = rows
    .map((r) => r.technicals.stochastic)
    .filter((v) => Number.isFinite(v));
  if (!vals.length) return 50;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

export function buildMarketCondition(
  rows: WatchlistScannerRow[],
  intelligenceMap?: Map<string, AggregatedTickerIntelligence>
): MarketConditionResult {
  const benchmarks = rows.filter((r) =>
    BENCHMARKS.includes(r.ticker as (typeof BENCHMARKS)[number])
  );

  const biases = benchmarks.map((r) => trendBias(r));
  const bullishCount = biases.filter((b) => b === "bullish").length;
  const bearishCount = biases.filter((b) => b === "bearish").length;
  const neutralCount = biases.filter((b) => b === "neutral").length;

  const avgSo = avgStochastic(benchmarks.length ? benchmarks : rows);
  const intelScores = BENCHMARKS.map(
    (t) => intelligenceMap?.get(t)?.sentimentScore ?? 0
  );
  const avgIntel =
    intelScores.reduce<number>((s, v) => s + v, 0) /
    Math.max(intelScores.length, 1);

  let condition: MarketConditionType;
  let preferredStrategy: string;
  let reason: string;
  let warning: string | null = null;

  if (bullishCount >= 3) {
    condition = "Bullish";
    preferredStrategy = "Bull Put";
    reason = `${bullishCount}/${benchmarks.length || 4} benchmarks show bullish trend — prefer Bull Put spreads`;
  } else if (bearishCount >= 3) {
    condition = "Bearish";
    preferredStrategy = "Bear Call";
    reason = `${bearishCount}/${benchmarks.length || 4} benchmarks show bearish trend — prefer Bear Call spreads`;
  } else if (
    neutralCount >= 2 &&
    avgSo >= 40 &&
    avgSo <= 60
  ) {
    condition = "Neutral";
    preferredStrategy = "Iron Condor";
    reason = `Mixed trends with average SO ${avgSo.toFixed(0)} (40–60) — prefer Iron Condor`;
  } else if (bullishCount > 0 && bearishCount > 0) {
    condition = "Transition";
    preferredStrategy = "No Trade / Wait";
    reason = "Conflicting benchmark signals — wait for clearer market direction";
    warning = "Transition market — avoid new entries until alignment improves";
  } else {
    condition = "Neutral";
    preferredStrategy = "Iron Condor";
    reason = "No clear majority trend — range strategies favored";
  }

  if (avgIntel <= -1 && condition === "Bullish") {
    warning = "Market intelligence sentiment is bearish — review before bullish entries";
  }
  if (avgIntel >= 1 && condition === "Bearish") {
    warning = "Market intelligence sentiment is bullish — review before bearish entries";
  }

  const agreement = Math.max(bullishCount, bearishCount, neutralCount);
  const confidencePct = Math.round(
    (agreement / Math.max(benchmarks.length, 1)) * 100
  );

  return {
    condition,
    preferredStrategy,
    confidencePct,
    reason,
    warning,
    benchmarkScores: benchmarks.map((r) => ({
      ticker: r.ticker,
      trendPassed: r.score?.trend.passed ?? false,
      stochastic: r.technicals.stochastic,
    })),
  };
}

export function marketConditionSupportsStrategy(
  condition: MarketConditionType,
  strategyLabel: string
): boolean {
  const s = strategyLabel.toLowerCase();
  if (condition === "Bullish") return s.includes("bull put");
  if (condition === "Bearish") return s.includes("bear call");
  if (condition === "Neutral") return s.includes("iron condor");
  return false;
}
