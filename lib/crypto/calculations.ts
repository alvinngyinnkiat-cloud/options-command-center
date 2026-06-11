import type {
  CryptoHoldingMetrics,
  CryptoPortfolioManualState,
  CryptoTrackerSummary,
  EnrichedCryptoHolding,
} from "./types";
import type { PortfolioOverrideInput } from "@/lib/portfolio/types";

/** Current Crypto Value SGD − Total Crypto Contributions / Cost SGD */
export function calculateCryptoProfitLossSgd(
  currentValueSgd: number,
  totalInvestedSgd: number
): number {
  return currentValueSgd - totalInvestedSgd;
}

/** (Profit/Loss SGD / Total SGD Invested) × 100 */
export function calculateCryptoReturnPct(
  profitLossSgd: number,
  totalInvestedSgd: number
): number {
  if (totalInvestedSgd <= 0) return 0;
  return (profitLossSgd / totalInvestedSgd) * 100;
}

/** Current Value SGD / Total Crypto Portfolio Value × 100 */
export function calculateCryptoAllocationPct(
  currentValueSgd: number,
  totalCryptoPortfolioValue: number
): number {
  if (totalCryptoPortfolioValue <= 0) return 0;
  return (currentValueSgd / totalCryptoPortfolioValue) * 100;
}

export function buildCryptoHoldingMetrics(
  totalInvestedSgd: number,
  currentValueSgd: number,
  totalCryptoPortfolioValue: number
): CryptoHoldingMetrics {
  const profitLossSgd = calculateCryptoProfitLossSgd(
    currentValueSgd,
    totalInvestedSgd
  );
  return {
    profitLossSgd,
    returnPct: calculateCryptoReturnPct(profitLossSgd, totalInvestedSgd),
    allocationPct: calculateCryptoAllocationPct(
      currentValueSgd,
      totalCryptoPortfolioValue
    ),
  };
}

export function buildCryptoTrackerSummary(
  holdings: EnrichedCryptoHolding[]
): CryptoTrackerSummary {
  const totalInvestedSgd = holdings.reduce(
    (s, h) => s + h.totalInvestedSgd,
    0
  );
  const totalCurrentValueSgd = holdings.reduce(
    (s, h) => s + h.currentValueSgd,
    0
  );
  const totalProfitLossSgd = calculateCryptoProfitLossSgd(
    totalCurrentValueSgd,
    totalInvestedSgd
  );
  const totalReturnPct = calculateCryptoReturnPct(
    totalProfitLossSgd,
    totalInvestedSgd
  );

  const largest =
    holdings.length > 0
      ? holdings.reduce((best, h) =>
          h.currentValueSgd > best.currentValueSgd ? h : best
        )
      : null;

  const best =
    holdings.length > 0
      ? holdings.reduce((best, h) => (h.returnPct > best.returnPct ? h : best))
      : null;

  return {
    totalInvestedSgd,
    totalCurrentValueSgd,
    totalProfitLossSgd,
    totalReturnPct,
    largestHolding: largest
      ? { ticker: largest.ticker, valueSgd: largest.currentValueSgd }
      : null,
    bestPerforming: best
      ? { ticker: best.ticker, returnPct: best.returnPct }
      : null,
  };
}

export function resolveTotalCryptoContributionsSgd(
  override: PortfolioOverrideInput | null | undefined,
  holdings: EnrichedCryptoHolding[]
): number {
  if (override?.manualCryptoContributionsSgd != null) {
    return override.manualCryptoContributionsSgd;
  }
  return holdings.reduce((s, h) => s + h.totalInvestedSgd, 0);
}

export function buildCryptoPortfolioManualState(input: {
  cryptoHoldingsValueSgd: number;
  cryptoCashSgd: number;
  totalContributionsSgd: number;
  totalFeesPaidSgd?: number;
}): CryptoPortfolioManualState {
  const totalCryptoPortfolioValueSgd =
    input.cryptoHoldingsValueSgd + input.cryptoCashSgd;
  const profitLossSgd = calculateCryptoProfitLossSgd(
    totalCryptoPortfolioValueSgd,
    input.totalContributionsSgd
  );
  return {
    cryptoHoldingsValueSgd: input.cryptoHoldingsValueSgd,
    cryptoCashSgd: input.cryptoCashSgd,
    totalCryptoPortfolioValueSgd,
    totalContributionsSgd: input.totalContributionsSgd,
    profitLossSgd,
    returnPct: calculateCryptoReturnPct(
      profitLossSgd,
      input.totalContributionsSgd
    ),
    totalFeesPaidSgd: input.totalFeesPaidSgd ?? 0,
  };
}

export function buildCryptoPortfolioManualFromTracker(input: {
  override: PortfolioOverrideInput | null | undefined;
  cryptoHoldingsValueSgd: number;
  cryptoCashSgd: number;
  holdings: EnrichedCryptoHolding[];
}): CryptoPortfolioManualState {
  return buildCryptoPortfolioManualState({
    cryptoHoldingsValueSgd: input.cryptoHoldingsValueSgd,
    cryptoCashSgd: input.cryptoCashSgd,
    totalContributionsSgd: resolveTotalCryptoContributionsSgd(
      input.override,
      input.holdings
    ),
  });
}
