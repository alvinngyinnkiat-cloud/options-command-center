import {
  calculateSellCallRequiredShares,
  NAKED_CALL_UNLIMITED_RISK_MESSAGE,
} from "@/lib/trades/strategy-meta";
import type { EnrichedTrade } from "@/lib/trades/types";

export interface SellPutCashCheck {
  tradeId: string;
  ticker: string;
  contracts: number;
  shortPutStrike: number | null;
  requiredCash: number;
  usdCashAvailable: number;
  canOpen: boolean;
}

export interface SellCallShareCheck {
  tradeId: string;
  ticker: string;
  contracts: number;
  coverage: "covered" | "naked";
  sharesOwned: number | null;
  requiredShares: number;
  canOpen: boolean;
  isNaked: boolean;
  nakedWarning: string | null;
}

export interface SingleLegRiskChecks {
  sellPutChecks: SellPutCashCheck[];
  sellCallChecks: SellCallShareCheck[];
}

export function evaluateSellPutCashCheck(input: {
  tradeId: string;
  ticker: string;
  contracts: number;
  shortPutStrike: number | null;
  requiredCash: number | null;
  usdCashAvailable: number;
}): SellPutCashCheck {
  const requiredCash = input.requiredCash ?? 0;
  return {
    tradeId: input.tradeId,
    ticker: input.ticker,
    contracts: input.contracts,
    shortPutStrike: input.shortPutStrike,
    requiredCash,
    usdCashAvailable: input.usdCashAvailable,
    canOpen: requiredCash > 0 && input.usdCashAvailable >= requiredCash,
  };
}

export function evaluateSellCallShareCheck(input: {
  tradeId: string;
  ticker: string;
  contracts: number;
  coverage: "covered" | "naked";
  sharesOwned: number | null;
  requiredShares: number | null;
}): SellCallShareCheck {
  const requiredShares =
    input.requiredShares ?? calculateSellCallRequiredShares(input.contracts);
  const isNaked = input.coverage === "naked";
  const owned = input.sharesOwned ?? 0;

  return {
    tradeId: input.tradeId,
    ticker: input.ticker,
    contracts: input.contracts,
    coverage: input.coverage,
    sharesOwned: input.sharesOwned,
    requiredShares,
    canOpen: !isNaked && owned >= requiredShares,
    isNaked,
    nakedWarning: isNaked ? NAKED_CALL_UNLIMITED_RISK_MESSAGE : null,
  };
}

export function buildSingleLegRiskChecks(
  openTrades: EnrichedTrade[],
  usdCashAvailable: number
): SingleLegRiskChecks {
  const sellPutChecks: SellPutCashCheck[] = [];
  const sellCallChecks: SellCallShareCheck[] = [];

  for (const trade of openTrades) {
    if (trade.strategy === "sell_put") {
      sellPutChecks.push(
        evaluateSellPutCashCheck({
          tradeId: trade.id,
          ticker: trade.ticker,
          contracts: trade.contracts,
          shortPutStrike: trade.strikes.shortStrikePut,
          requiredCash: trade.calculations.cashRequired,
          usdCashAvailable,
        })
      );
    }
    if (trade.strategy === "sell_call") {
      sellCallChecks.push(
        evaluateSellCallShareCheck({
          tradeId: trade.id,
          ticker: trade.ticker,
          contracts: trade.contracts,
          coverage: trade.sellCallCoverage,
          sharesOwned: trade.sharesOwned,
          requiredShares: trade.calculations.requiredShares,
        })
      );
    }
  }

  return { sellPutChecks, sellCallChecks };
}

/** Portfolio-level sell put probe using support as proxy strike (1 contract). */
export function evaluateHypotheticalSellPutCash(
  usdCashAvailable: number,
  proxyStrike: number | null
): { requiredCash: number; canOpen: boolean } {
  if (proxyStrike == null || proxyStrike <= 0) {
    return { requiredCash: 0, canOpen: false };
  }
  const requiredCash = proxyStrike * 100;
  return {
    requiredCash,
    canOpen: usdCashAvailable >= requiredCash,
  };
}

/** Portfolio-level sell call probe (1 contract). */
export function evaluateHypotheticalSellCallShares(
  sharesOwned: number
): { requiredShares: number; canOpen: boolean } {
  const requiredShares = 100;
  return {
    requiredShares,
    canOpen: sharesOwned >= requiredShares,
  };
}

export function lookupSharesForTicker(
  ticker: string,
  holdings: { ticker: string; shares_held: number | null }[]
): number {
  const match = holdings.find(
    (h) => h.ticker.toUpperCase() === ticker.toUpperCase()
  );
  return match?.shares_held ?? 0;
}
