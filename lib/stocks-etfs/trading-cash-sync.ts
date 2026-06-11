import type { MarketCategory } from "./market-category";

export interface PortfolioTradingCashSource {
  manualTradingCashUsd?: number | null;
  manualTradingCashSgd?: number | null;
}

export type TradingCashByMarket = Record<MarketCategory, number>;

/** Map Manual Portfolio Breakdown trading cash fields to market buckets. */
export function deriveTradingCashFromPortfolio(
  source: PortfolioTradingCashSource | null | undefined
): TradingCashByMarket {
  const usdTotal = Math.max(0, Number(source?.manualTradingCashUsd ?? 0));
  const sgdTotal = Math.max(0, Number(source?.manualTradingCashSgd ?? 0));
  const halfUsd = usdTotal / 2;

  return {
    us_etf: halfUsd,
    us_stock: halfUsd,
    sg_stock: sgdTotal,
  };
}

export function tradingCashFromPortfolioOverride(row: {
  manual_trading_cash_usd?: number | null;
  manual_trading_cash_sgd?: number | null;
} | null): TradingCashByMarket {
  return deriveTradingCashFromPortfolio({
    manualTradingCashUsd: row?.manual_trading_cash_usd,
    manualTradingCashSgd: row?.manual_trading_cash_sgd,
  });
}

/** Before any ledger activity, show portfolio trading cash when stored balances are zero. */
export function resolveDisplayTradingCash(
  stored: TradingCashByMarket,
  portfolioDerived: TradingCashByMarket,
  hasLedgerActivity: boolean
): TradingCashByMarket {
  if (hasLedgerActivity) return stored;

  const storedTotal = stored.us_etf + stored.us_stock + stored.sg_stock;
  const portfolioTotal =
    portfolioDerived.us_etf + portfolioDerived.us_stock + portfolioDerived.sg_stock;

  if (storedTotal > 0 || portfolioTotal <= 0) return stored;
  return portfolioDerived;
}
