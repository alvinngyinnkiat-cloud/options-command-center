import type {
  CryptoHoldingMetrics,
  CryptoTrackerSummary,
  EnrichedCryptoHolding,
} from "./types";

/** Current Value SGD − Total SGD Invested */
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
