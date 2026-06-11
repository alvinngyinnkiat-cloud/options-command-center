import type { MarketCategory } from "./market-category";

export type TradingCashByMarket = Record<MarketCategory, number>;

export interface PortfolioTradingCashSource {
  manualTradingCashUsd?: number | null;
  manualTradingCashSgd?: number | null;
  manual_trading_cash_usd?: number | null;
  manual_trading_cash_sgd?: number | null;
}

/** Read stored per-market cash balances — no inference from portfolio or holdings. */
export function tradingCashFromStoredBalances(
  stored: TradingCashByMarket
): TradingCashByMarket {
  return {
    us_etf: Math.max(0, stored.us_etf),
    us_stock: Math.max(0, stored.us_stock),
    sg_stock: Math.max(0, stored.sg_stock),
  };
}

/** Portfolio dashboard reference totals (not auto-applied to market buckets). */
export function portfolioTradingCashTotals(
  source: PortfolioTradingCashSource | null | undefined
): { tradingCashUsd: number; tradingCashSgd: number } {
  return {
    tradingCashUsd: Math.max(
      0,
      Number(
        source?.manualTradingCashUsd ?? source?.manual_trading_cash_usd ?? 0
      )
    ),
    tradingCashSgd: Math.max(
      0,
      Number(
        source?.manualTradingCashSgd ?? source?.manual_trading_cash_sgd ?? 0
      )
    ),
  };
}
