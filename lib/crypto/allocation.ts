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

export interface CryptoTierGroup {
  label: string;
  value: number;
  percent: number;
  color: string;
  holdings: CryptoRankedHolding[];
}

export interface CryptoDeploymentBucket {
  label: string;
  percent: number;
  amountSgd: number;
}

const TIER_COLORS: Record<string, string> = {
  "Top Holding": "#f7931a",
  "2nd–5th Holdings": "#627eea",
  "6th–10th Holdings": "#9945ff",
  Others: "#64748b",
};

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

/** Four tier groups for allocation chart and Holdings by Tier. */
export function buildCryptoTierGroups(
  holdings: EnrichedCryptoHolding[],
  cryptoCashSgd: number,
  totalCryptoPortfolioValue: number
): CryptoTierGroup[] {
  const rankings = buildCryptoRankings(holdings);
  const top = rankings.slice(0, 10);
  const outsideTop10 = rankings.slice(10);

  const topHolding = top[0] ?? null;
  const secondToFifth = top.slice(1, 5);
  const sixthToTenth = top.slice(5, 10);

  const topHoldingValue = topHolding?.currentValueSgd ?? 0;
  const secondToFifthValue = secondToFifth.reduce(
    (s, h) => s + h.currentValueSgd,
    0
  );
  const sixthToTenthValue = sixthToTenth.reduce(
    (s, h) => s + h.currentValueSgd,
    0
  );
  const othersValue =
    outsideTop10.reduce((s, h) => s + h.currentValueSgd, 0) + cryptoCashSgd;

  const tiers: Omit<CryptoTierGroup, "percent">[] = [
    {
      label: "Top Holding",
      value: topHoldingValue,
      color: TIER_COLORS["Top Holding"],
      holdings: topHolding ? [topHolding] : [],
    },
    {
      label: "2nd–5th Holdings",
      value: secondToFifthValue,
      color: TIER_COLORS["2nd–5th Holdings"],
      holdings: secondToFifth,
    },
    {
      label: "6th–10th Holdings",
      value: sixthToTenthValue,
      color: TIER_COLORS["6th–10th Holdings"],
      holdings: sixthToTenth,
    },
    {
      label: "Others",
      value: othersValue,
      color: TIER_COLORS.Others,
      holdings: outsideTop10,
    },
  ];

  return tiers.map((tier) => ({
    ...tier,
    percent:
      totalCryptoPortfolioValue > 0
        ? calculateCryptoAllocationPct(tier.value, totalCryptoPortfolioValue)
        : 0,
  }));
}

export function tierGroupsToAllocationSlices(
  tiers: CryptoTierGroup[]
): CryptoAllocationSlice[] {
  return tiers
    .filter((t) => t.value > 0)
    .map((t) => ({
      name: t.label,
      value: t.value,
      percent: t.percent,
      color: t.color,
    }));
}

/** @deprecated Use buildCryptoTierGroups + tierGroupsToAllocationSlices */
export function buildCryptoAllocationSlices(
  holdings: EnrichedCryptoHolding[],
  cryptoCashSgd: number
): CryptoAllocationSlice[] {
  const total =
    coinHoldingsOnly(holdings).reduce((s, h) => s + h.currentValueSgd, 0) +
    cryptoCashSgd;
  const tiers = buildCryptoTierGroups(holdings, cryptoCashSgd, total);
  return tierGroupsToAllocationSlices(tiers);
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
  return coinHoldingsOnly(holdings)
    .filter((h) => h.currentValueSgd > 0)
    .reduce((s, h) => s + h.currentValueSgd, 0);
}

export function splitOpenClosedHoldings(
  holdings: EnrichedCryptoHolding[]
): {
  open: EnrichedCryptoHolding[];
  closed: EnrichedCryptoHolding[];
} {
  const open = holdings.filter((h) => h.currentValueSgd > 0);
  const closed = holdings.filter((h) => h.currentValueSgd === 0);
  return { open, closed };
}
