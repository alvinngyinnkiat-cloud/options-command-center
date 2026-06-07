import { buildCategoryValuesSgd, buildStockEtfTabData } from "@/lib/stocks-etfs/build-tab-data";
import { enrichAllStockEtfHoldings } from "@/lib/stocks-etfs/map-holding";
import type { EnrichedTrade } from "@/lib/trades/types";
import type { StockEtfHolding } from "@/types/database";

export interface PortfolioCategoryBreakdown {
  usEtfValueSgd: number;
  usStockValueSgd: number;
  sgStockValueSgd: number;
  cryptoValueSgd: number;
  cashValueSgd: number;
  totalPortfolioValueSgd: number;
  totalPremiumCollected: number;
  usEtfPremium: number;
  usStockPremium: number;
  leapsPremium: number;
  usEtfPct: number;
  usStockPct: number;
  sgStockPct: number;
  cryptoPct: number;
  cashPct: number;
}

export function buildPortfolioCategoryBreakdown(input: {
  stockHoldings: StockEtfHolding[];
  trades: EnrichedTrade[];
  cryptoValueSgd: number;
  cashValueSgd: number;
  totalPortfolioValueSgd: number;
}): PortfolioCategoryBreakdown {
  const holdings = enrichAllStockEtfHoldings(input.stockHoldings);
  const { usEtfValueSgd, usStockValueSgd, sgStockValueSgd } =
    buildCategoryValuesSgd(holdings);
  const tabs = buildStockEtfTabData(holdings, input.trades);

  const usEtfPremium = tabs.usEtf.summary.totalPremiumCollected;
  const usStockPremium = tabs.usStock.summary.totalPremiumCollected;
  const leapsPremium = input.trades
    .filter((t) => t.parentTradeId != null || t.strategy === "leaps")
    .reduce((s, t) => {
      if (t.strategy === "leaps") return s;
      return s + t.calculations.totalPremiumReceived;
    }, 0);

  const total = input.totalPortfolioValueSgd;
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  return {
    usEtfValueSgd,
    usStockValueSgd,
    sgStockValueSgd,
    cryptoValueSgd: input.cryptoValueSgd,
    cashValueSgd: input.cashValueSgd,
    totalPortfolioValueSgd: total,
    totalPremiumCollected: usEtfPremium + usStockPremium,
    usEtfPremium,
    usStockPremium,
    leapsPremium,
    usEtfPct: pct(usEtfValueSgd),
    usStockPct: pct(usStockValueSgd),
    sgStockPct: pct(sgStockValueSgd),
    cryptoPct: pct(input.cryptoValueSgd),
    cashPct: pct(input.cashValueSgd),
  };
}
