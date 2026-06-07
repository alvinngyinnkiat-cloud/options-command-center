import {
  calculateMarketValueSgd,
  DEFAULT_USD_SGD_RATE,
} from "@/lib/portfolio/currency";
import type { CurrencyCode } from "@/types/database";
import type {
  EnrichedStockEtfHolding,
  SectorAllocationEntry,
  StockEtfCurrencyBreakdown,
  StockEtfHoldingMetrics,
  StockEtfTrackerSummary,
} from "./types";

/** Current Market Value SGD − Total Capital Invested SGD */
export function calculateStockEtfProfitLossSgd(
  currentValueSgd: number,
  totalInvestedSgd: number
): number {
  return currentValueSgd - totalInvestedSgd;
}

/** (Profit/Loss / Total Capital Invested) × 100 */
export function calculateStockEtfReturnPct(
  profitLossSgd: number,
  totalInvestedSgd: number
): number {
  if (totalInvestedSgd <= 0) return 0;
  return (profitLossSgd / totalInvestedSgd) * 100;
}

/** Current Value / Total Stock & ETF Portfolio Value × 100 */
export function calculateStockEtfAllocationPct(
  currentValueSgd: number,
  totalPortfolioValueSgd: number
): number {
  if (totalPortfolioValueSgd <= 0) return 0;
  return (currentValueSgd / totalPortfolioValueSgd) * 100;
}

export function toSgdAmount(
  native: number,
  currency: CurrencyCode,
  fxRateToSgd: number = DEFAULT_USD_SGD_RATE
): number {
  return calculateMarketValueSgd(native, currency, fxRateToSgd);
}

export function buildStockEtfHoldingMetrics(
  totalInvestedSgd: number,
  currentValueSgd: number,
  totalPortfolioValueSgd: number
): StockEtfHoldingMetrics {
  const profitLossSgd = calculateStockEtfProfitLossSgd(
    currentValueSgd,
    totalInvestedSgd
  );
  return {
    totalInvestedSgd,
    currentValueSgd,
    profitLossSgd,
    returnPct: calculateStockEtfReturnPct(profitLossSgd, totalInvestedSgd),
    allocationPct: calculateStockEtfAllocationPct(
      currentValueSgd,
      totalPortfolioValueSgd
    ),
  };
}

export function buildCurrencyBreakdown(
  holdings: EnrichedStockEtfHolding[]
): StockEtfCurrencyBreakdown {
  let sgdHoldingsValueSgd = 0;
  let usdHoldingsValueNative = 0;
  let usdHoldingsValueSgd = 0;

  for (const h of holdings) {
    if (h.currency === "SGD") {
      sgdHoldingsValueSgd += h.currentValueSgd;
    } else {
      usdHoldingsValueNative += h.currentValueNative;
      usdHoldingsValueSgd += h.currentValueSgd;
    }
  }

  return {
    sgdHoldingsValueSgd,
    usdHoldingsValueNative,
    usdHoldingsValueSgd,
    totalSgdEquivalent: sgdHoldingsValueSgd + usdHoldingsValueSgd,
  };
}

export function buildSectorAllocation(
  holdings: EnrichedStockEtfHolding[]
): SectorAllocationEntry[] {
  const total = holdings.reduce((s, h) => s + h.currentValueSgd, 0);
  const bySector = new Map<string, number>();

  for (const h of holdings) {
    bySector.set(h.sector, (bySector.get(h.sector) ?? 0) + h.currentValueSgd);
  }

  return Array.from(bySector.entries())
    .map(([sector, valueSgd]) => ({
      sector: sector as SectorAllocationEntry["sector"],
      valueSgd,
      allocationPct: calculateStockEtfAllocationPct(valueSgd, total),
    }))
    .sort((a, b) => b.valueSgd - a.valueSgd);
}

export function buildStockEtfTrackerSummary(
  holdings: EnrichedStockEtfHolding[]
): StockEtfTrackerSummary {
  const totalInvestedSgd = holdings.reduce(
    (s, h) => s + h.totalInvestedSgd,
    0
  );
  const totalCurrentValueSgd = holdings.reduce(
    (s, h) => s + h.currentValueSgd,
    0
  );
  const totalProfitLossSgd = calculateStockEtfProfitLossSgd(
    totalCurrentValueSgd,
    totalInvestedSgd
  );
  const totalReturnPct = calculateStockEtfReturnPct(
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
      ? holdings.reduce((b, h) => (h.returnPct > b.returnPct ? h : b))
      : null;

  const worst =
    holdings.length > 0
      ? holdings.reduce((w, h) => (h.returnPct < w.returnPct ? h : w))
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
    worstPerforming: worst
      ? { ticker: worst.ticker, returnPct: worst.returnPct }
      : null,
    currencyBreakdown: buildCurrencyBreakdown(holdings),
  };
}
