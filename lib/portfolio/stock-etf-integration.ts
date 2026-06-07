import type { EnrichedStockEtfHolding } from "@/lib/stocks-etfs/types";
import type { StockEtfHolding } from "@/types/database";
import type { HoldingInput, PortfolioRawInput } from "./types";

function isLegacyStockOrEtf(h: HoldingInput): boolean {
  return h.asset_type === "stock" || h.asset_type === "etf";
}

/** Maps stock/ETF tracker row to portfolio holding for dashboard aggregation. */
export function stockEtfHoldingToPortfolioInput(
  holding: StockEtfHolding | EnrichedStockEtfHolding
): HoldingInput {
  const currentValueSgd =
    "current_value_sgd" in holding
      ? Number(holding.current_value_sgd)
      : holding.currentValueSgd;
  const totalInvestedSgd =
    "total_invested_sgd" in holding
      ? Number(holding.total_invested_sgd)
      : holding.totalInvestedSgd;
  const currency =
    "currency" in holding && typeof holding.currency === "string"
      ? holding.currency
      : "SGD";
  const assetType =
    "asset_type" in holding
      ? (holding.asset_type as "stock" | "etf")
      : holding.assetType;
  const native =
    "current_value_native" in holding
      ? Number(holding.current_value_native)
      : holding.currentValueNative;
  const fxRate =
    "fx_rate_to_sgd" in holding
      ? Number(holding.fx_rate_to_sgd)
      : holding.fxRateToSgd;

  return {
    ticker: holding.ticker,
    asset_type: assetType,
    currency: currency as HoldingInput["currency"],
    market_value_native: native,
    fx_rate_to_sgd: fxRate,
    market_value_sgd: currentValueSgd,
    market_value: currentValueSgd,
    cost_basis: totalInvestedSgd,
  };
}

/**
 * Replaces legacy stock/ETF rows in portfolio raw input with tracker values.
 * Keeps options, crypto, and cash separate.
 */
export function applyStockEtfTrackerToPortfolioRaw(
  raw: PortfolioRawInput,
  stockRows: (StockEtfHolding | EnrichedStockEtfHolding)[]
): PortfolioRawInput {
  if (stockRows.length === 0) return raw;

  const nonStockEtf = raw.holdings.filter((h) => !isLegacyStockOrEtf(h));
  const trackerHoldings = stockRows.map(stockEtfHoldingToPortfolioInput);

  return {
    ...raw,
    holdings: [...nonStockEtf, ...trackerHoldings],
  };
}

export function getStockEtfPortfolioValueSgd(
  stockRows: (StockEtfHolding | EnrichedStockEtfHolding)[]
): number {
  return stockRows.reduce((s, h) => {
    const v =
      "current_value_sgd" in h
        ? Number(h.current_value_sgd)
        : h.currentValueSgd;
    return s + v;
  }, 0);
}
