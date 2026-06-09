import { calculateCryptoAllocationPct } from "./calculations";
import type { EnrichedCryptoHolding } from "./types";
import { isCryptoCashAsset } from "@/lib/portfolio/capital-pools";

export interface CryptoAllocationSlice {
  name: string;
  value: number;
  percent: number;
  color: string;
}

export interface CryptoRankedHolding {
  rank: number;
  ticker: string;
  currentValueSgd: number;
  allocationPct: number;
}

export interface CryptoDeploymentBucket {
  label: string;
  percent: number;
  amountSgd: number;
}

const SLICE_COLORS: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#627eea",
  SOL: "#9945ff",
  USDT: "#26a17b",
  USDC: "#2775ca",
  XRP: "#23292f",
  ADA: "#0033ad",
  "Other coins": "#64748b",
  "Crypto Cash": "#94a3b8",
};

const FEATURED_TICKERS = ["BTC", "ETH", "SOL", "USDT", "USDC", "XRP", "ADA"];

const DEPLOYMENT_BUCKETS: { label: string; percent: number }[] = [
  { label: "Top Holding", percent: 50 },
  { label: "2nd–5th Holdings", percent: 25 },
  { label: "6th–10th Holdings", percent: 15 },
  { label: "Others", percent: 10 },
];

function coinHoldingsOnly(
  holdings: EnrichedCryptoHolding[]
): EnrichedCryptoHolding[] {
  return holdings.filter(
    (h) => !isCryptoCashAsset(h.ticker, h.assetLabel)
  );
}

export function buildCryptoAllocationSlices(
  holdings: EnrichedCryptoHolding[],
  cryptoCashSgd: number
): CryptoAllocationSlice[] {
  const coins = coinHoldingsOnly(holdings);
  const totalPortfolio =
    coins.reduce((s, h) => s + h.currentValueSgd, 0) + cryptoCashSgd;

  if (totalPortfolio <= 0) return [];

  const featured = new Set(FEATURED_TICKERS);
  const slices: CryptoAllocationSlice[] = [];
  let otherSgd = 0;

  for (const h of coins) {
    if (featured.has(h.ticker.toUpperCase())) {
      slices.push({
        name: h.ticker.toUpperCase(),
        value: h.currentValueSgd,
        percent: calculateCryptoAllocationPct(
          h.currentValueSgd,
          totalPortfolio
        ),
        color: SLICE_COLORS[h.ticker.toUpperCase()] ?? "#64748b",
      });
    } else {
      otherSgd += h.currentValueSgd;
    }
  }

  if (otherSgd > 0) {
    slices.push({
      name: "Other coins",
      value: otherSgd,
      percent: calculateCryptoAllocationPct(otherSgd, totalPortfolio),
      color: SLICE_COLORS["Other coins"],
    });
  }

  if (cryptoCashSgd > 0) {
    slices.push({
      name: "Crypto Cash",
      value: cryptoCashSgd,
      percent: calculateCryptoAllocationPct(cryptoCashSgd, totalPortfolio),
      color: SLICE_COLORS["Crypto Cash"],
    });
  }

  return slices.sort((a, b) => b.value - a.value);
}

export function buildCryptoRankings(
  holdings: EnrichedCryptoHolding[]
): CryptoRankedHolding[] {
  const coins = coinHoldingsOnly(holdings);
  const total = coins.reduce((s, h) => s + h.currentValueSgd, 0);

  return [...coins]
    .sort((a, b) => b.currentValueSgd - a.currentValueSgd)
    .map((h, i) => ({
      rank: i + 1,
      ticker: h.ticker,
      currentValueSgd: h.currentValueSgd,
      allocationPct: calculateCryptoAllocationPct(h.currentValueSgd, total),
    }));
}

export function buildCryptoDeploymentPlan(
  cryptoCashSgd: number
): CryptoDeploymentBucket[] {
  return DEPLOYMENT_BUCKETS.map((bucket) => ({
    label: bucket.label,
    percent: bucket.percent,
    amountSgd: (cryptoCashSgd * bucket.percent) / 100,
  }));
}

export function buildCoinHoldingsTotal(
  holdings: EnrichedCryptoHolding[]
): number {
  return coinHoldingsOnly(holdings).reduce(
    (s, h) => s + h.currentValueSgd,
    0
  );
}
