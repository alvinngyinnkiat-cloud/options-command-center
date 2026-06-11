import { calculateAdjustedCostBasisSg, calculateIncomeYieldPct, calculateRoiPct } from "@/lib/ticker-positions/income-yield";
import { resolveTickerDividendIncome } from "@/lib/dividends/calculations";
import type { TickerDividendTotals } from "@/lib/dividends/types";
import type { EnrichedTrade } from "@/lib/trades/types";
import type { StockEtfHolding } from "@/types/database";
import { filterHoldingsByCategory } from "./market-category";
import type {
  EnrichedStockEtfHolding,
  SgStockRow,
  SgStockTabSummary,
  StockEtfTabData,
} from "./types";
import {
  buildUsEquityTabData,
} from "./us-equity-positions";
import { US_ETF_TAB, US_STOCK_TAB } from "./market-category";

function buildSgStockRow(
  holding: EnrichedStockEtfHolding,
  dividendTotals?: Map<string, TickerDividendTotals>
): SgStockRow {
  const shares = holding.sharesHeld ?? 0;
  const marketValue = holding.currentValueNative;
  const capitalDeployed = holding.totalInvestedNative;
  const dividendResolved = resolveTickerDividendIncome(
    holding.ticker,
    dividendTotals ?? new Map()
  );
  const dividendIncome = dividendResolved.lifetimeNetDividends;
  const annualDividendIncome = dividendResolved.annualDividendIncome;
  const dividendYield =
    marketValue > 0 ? (annualDividendIncome / marketValue) * 100 : null;
  const adjustedCostBasis = calculateAdjustedCostBasisSg(
    capitalDeployed,
    dividendIncome
  );
  const unrealizedPnl = marketValue - capitalDeployed;
  const netPositionPnl = marketValue - adjustedCostBasis;
  const totalPnl = netPositionPnl + dividendIncome;
  const unrealizedPnlPct =
    capitalDeployed > 0 ? (unrealizedPnl / capitalDeployed) * 100 : 0;
  const currentPrice =
    shares > 0 && marketValue > 0 ? marketValue / shares : null;

  return {
    holding,
    shares,
    averageCost: holding.averageCost,
    currentPrice,
    marketValue,
    unrealizedPnl,
    unrealizedPnlPct,
    dividendYield,
    annualDividendIncome,
    dividendIncome,
    adjustedCostBasis,
    totalPnl,
    roiPct: calculateRoiPct(totalPnl, capitalDeployed),
    incomeYieldPct: calculateIncomeYieldPct(
      annualDividendIncome,
      capitalDeployed
    ),
  };
}

function buildSgStockTab(
  holdings: EnrichedStockEtfHolding[],
  dividendTotals?: Map<string, TickerDividendTotals>
): { rows: SgStockRow[]; summary: SgStockTabSummary } {
  const sgHoldings = filterHoldingsByCategory(holdings, "sg_stock");
  const rows = sgHoldings.map((h) => buildSgStockRow(h, dividendTotals));
  const openRows = rows.filter((r) => r.shares > 0);
  const totalCapital = openRows.reduce(
    (s, r) => s + r.holding.totalInvestedNative,
    0
  );
  const totalPnl = openRows.reduce((s, r) => s + r.totalPnl, 0);
  return {
    rows,
    summary: {
      totalMarketValue: openRows.reduce((s, r) => s + r.marketValue, 0),
      totalCapital,
      totalDividendIncome: openRows.reduce((s, r) => s + r.dividendIncome, 0),
      totalPnl,
      totalReturnPct: calculateRoiPct(totalPnl, totalCapital),
      cashBalance: 0,
      totalFeesPaid: 0,
    },
  };
}

export function buildStockEtfTabData(
  holdings: EnrichedStockEtfHolding[],
  trades: EnrichedTrade[],
  dividendTotals?: Map<string, TickerDividendTotals>
): StockEtfTabData {
  return {
    usEtf: buildUsEquityTabData(US_ETF_TAB, holdings, trades, dividendTotals),
    usStock: buildUsEquityTabData(US_STOCK_TAB, holdings, trades, dividendTotals),
    sgStock: buildSgStockTab(holdings, dividendTotals),
  };
}

export function buildCategoryValuesSgd(
  holdings: EnrichedStockEtfHolding[]
): {
  usEtfValueSgd: number;
  usStockValueSgd: number;
  sgStockValueSgd: number;
} {
  let usEtfValueSgd = 0;
  let usStockValueSgd = 0;
  let sgStockValueSgd = 0;
  for (const h of holdings) {
    if (h.currency === "SGD") {
      sgStockValueSgd += h.currentValueSgd;
    } else if (h.assetType === "etf") {
      usEtfValueSgd += h.currentValueSgd;
    } else {
      usStockValueSgd += h.currentValueSgd;
    }
  }
  return { usEtfValueSgd, usStockValueSgd, sgStockValueSgd };
}

export function mapEnrichedToDbRow(
  holding: EnrichedStockEtfHolding
): StockEtfHolding {
  return {
    id: holding.id,
    user_id: "",
    ticker: holding.ticker,
    asset_type: holding.assetType,
    currency: holding.currency,
    sector: holding.sector,
    total_invested_native: holding.totalInvestedNative,
    current_value_native: holding.currentValueNative,
    fx_rate_to_sgd: holding.fxRateToSgd,
    total_invested_sgd: holding.totalInvestedSgd,
    current_value_sgd: holding.currentValueSgd,
    shares_held: holding.sharesHeld,
    average_cost: holding.averageCost,
    last_market_price_native: null,
    last_price_date: null,
    price_source: null,
    manual_value_override: false,
    notes: holding.notes,
    last_updated: holding.lastUpdated,
    created_at: holding.createdAt,
    updated_at: holding.updatedAt,
  };
}
