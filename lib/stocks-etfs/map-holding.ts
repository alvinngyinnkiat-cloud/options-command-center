import { resolveTickerDividendIncome } from "@/lib/dividends/calculations";
import type { TickerDividendTotals } from "@/lib/dividends/types";
import { toSgdAmount, buildStockEtfHoldingMetrics } from "./calculations";
import type {
  EnrichedStockEtfHolding,
  StockEtfHoldingFormInput,
  StockEtfSector,
} from "./types";
import type { StockEtfHolding, CurrencyCode } from "@/types/database";

export function enrichStockEtfHolding(
  row: StockEtfHolding,
  totalPortfolioValueSgd: number,
  dividendTotals?: Map<string, TickerDividendTotals>
): EnrichedStockEtfHolding {
  const shares = row.shares_held != null ? Number(row.shares_held) : null;
  const lastPrice =
    row.last_market_price_native != null
      ? Number(row.last_market_price_native)
      : null;
  const manualOverride = Boolean(
    (row as { manual_value_override?: boolean }).manual_value_override
  );

  let currentValueNative = Number(row.current_value_native);
  if (
    !manualOverride &&
    shares != null &&
    shares > 0 &&
    lastPrice != null &&
    lastPrice > 0
  ) {
    currentValueNative = Math.round(shares * lastPrice * 100) / 100;
  }

  const totalInvestedSgd = Number(row.total_invested_sgd);
  const currentValueSgd = toSgdAmount(
    currentValueNative,
    row.currency as CurrencyCode,
    Number(row.fx_rate_to_sgd)
  );
  const metrics = buildStockEtfHoldingMetrics(
    totalInvestedSgd,
    currentValueSgd,
    totalPortfolioValueSgd
  );
  const dividendResolved = resolveTickerDividendIncome(
    row.ticker,
    dividendTotals ?? new Map()
  );
  const annualDividendIncome = dividendResolved.annualDividendIncome;
  const dividendYield =
    currentValueNative > 0
      ? (annualDividendIncome / currentValueNative) * 100
      : null;

  return {
    id: row.id,
    ticker: row.ticker,
    assetType: row.asset_type as EnrichedStockEtfHolding["assetType"],
    currency: row.currency as EnrichedStockEtfHolding["currency"],
    sector: row.sector as StockEtfSector,
    totalInvestedNative: Number(row.total_invested_native),
    currentValueNative,
    fxRateToSgd: Number(row.fx_rate_to_sgd),
    totalInvestedSgd: metrics.totalInvestedSgd,
    currentValueSgd: metrics.currentValueSgd,
    profitLossSgd: metrics.profitLossSgd,
    returnPct: metrics.returnPct,
    allocationPct: metrics.allocationPct,
    sharesHeld: row.shares_held != null ? Number(row.shares_held) : null,
    averageCost: row.average_cost != null ? Number(row.average_cost) : null,
    dividendYield,
    annualDividendIncome,
    notes: row.notes,
    lastUpdated: row.last_updated,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function enrichAllStockEtfHoldings(
  rows: StockEtfHolding[],
  dividendTotals?: Map<string, TickerDividendTotals>
): EnrichedStockEtfHolding[] {
  const totalValue = rows.reduce(
    (s, r) => s + Number(r.current_value_sgd),
    0
  );
  return rows
    .map((r) => enrichStockEtfHolding(r, totalValue, dividendTotals))
    .sort((a, b) => b.currentValueSgd - a.currentValueSgd);
}

export function stockEtfRowFromForm(
  input: StockEtfHoldingFormInput,
  userId: string,
  existingId?: string,
  existingCreatedAt?: string
): StockEtfHolding {
  const now = new Date().toISOString();
  const today = now.split("T")[0];
  const totalInvestedSgd = toSgdAmount(
    input.totalInvestedNative,
    input.currency,
    input.fxRateToSgd
  );
  const currentValueSgd = toSgdAmount(
    input.currentValueNative,
    input.currency,
    input.fxRateToSgd
  );

  return {
    id: existingId ?? crypto.randomUUID(),
    user_id: userId,
    ticker: input.ticker.toUpperCase(),
    asset_type: input.assetType,
    currency: input.currency,
    sector: input.sector,
    total_invested_native: input.totalInvestedNative,
    current_value_native: input.currentValueNative,
    fx_rate_to_sgd: input.currency === "SGD" ? 1 : input.fxRateToSgd,
    total_invested_sgd: totalInvestedSgd,
    current_value_sgd: currentValueSgd,
    shares_held: input.sharesHeld,
    average_cost: input.averageCost,
    last_market_price_native: null,
    last_price_date: null,
    price_source: null,
    manual_value_override: false,
    notes: input.notes,
    last_updated: today,
    created_at: existingCreatedAt ?? now,
    updated_at: now,
  };
}
