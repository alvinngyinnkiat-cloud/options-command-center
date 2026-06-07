import type { ClientProfitSharingSummary } from "@/lib/client-profit-sharing/types";
import type { TradeAllocationRow } from "@/lib/client-profit-sharing/types";
import { buildClientCapitalMetrics } from "./client-capital";
import type { EnrichedCryptoHolding } from "@/lib/crypto/types";
import type { CryptoHolding } from "@/types/database";
import type { EnrichedTrade } from "@/lib/trades/types";
import type { HoldingInput } from "./types";

const CRYPTO_CASH_TICKERS = new Set([
  "USDT",
  "USDC",
  "USD",
  "SGD",
  "CASH",
  "STABLECOIN",
]);

export function isCryptoCashAsset(
  ticker: string,
  assetLabel?: string | null
): boolean {
  const t = ticker.toUpperCase();
  const label = (assetLabel ?? ticker).toUpperCase();
  return (
    CRYPTO_CASH_TICKERS.has(t) ||
    label === "CASH" ||
    label.includes("STABLE") ||
    label.includes("CASH")
  );
}

export type CryptoTrackerRow = CryptoHolding | EnrichedCryptoHolding;

function cryptoRowValue(row: CryptoTrackerRow): number {
  return "current_value_sgd" in row
    ? Number(row.current_value_sgd)
    : row.currentValueSgd;
}

function cryptoRowTicker(row: CryptoTrackerRow): string {
  return row.ticker;
}

function cryptoRowLabel(row: CryptoTrackerRow): string {
  return "asset_label" in row ? row.asset_label : row.assetLabel;
}

export function splitCryptoTrackerValues(rows: CryptoTrackerRow[]): {
  cryptoHoldingsSgd: number;
  cryptoCashSgd: number;
} {
  let cryptoHoldingsSgd = 0;
  let cryptoCashSgd = 0;

  for (const row of rows) {
    const value = cryptoRowValue(row);
    if (isCryptoCashAsset(cryptoRowTicker(row), cryptoRowLabel(row))) {
      cryptoCashSgd += value;
    } else {
      cryptoHoldingsSgd += value;
    }
  }

  return { cryptoHoldingsSgd, cryptoCashSgd };
}

export interface TradingCashBalances {
  brokerUsdCashNative: number;
  /** Broker USD cash — manually entered SGD equivalent (no FX applied here). */
  brokerUsdCashSgdEquivalent: number;
  brokerSgdCash: number;
  tradingCashSgd: number;
}

export function extractTradingCash(holdings: HoldingInput[]): TradingCashBalances {
  let brokerUsdCashNative = 0;
  let brokerUsdCashSgdEquivalent = 0;
  let brokerSgdCash = 0;

  for (const holding of holdings) {
    const ticker = holding.ticker.toUpperCase();
    if (ticker !== "CASH" && !ticker.startsWith("CASH.")) continue;

    if (holding.currency === "USD") {
      brokerUsdCashNative += holding.market_value_native;
      brokerUsdCashSgdEquivalent += holding.market_value_sgd;
    } else {
      brokerSgdCash += holding.market_value_sgd;
    }
  }

  return {
    brokerUsdCashNative,
    brokerUsdCashSgdEquivalent,
    brokerSgdCash,
    tradingCashSgd: brokerUsdCashSgdEquivalent + brokerSgdCash,
  };
}

export interface CashBreakdown {
  tradingCashSgd: number;
  brokerUsdCashNative: number;
  brokerUsdCashSgdEquivalent: number;
  brokerSgdCash: number;
  cryptoCashSgd: number;
  totalCashSgd: number;
  availableForStocksSgd: number;
  availableForEtfsSgd: number;
  availableForOptionsSgd: number;
  availableForCryptoSgd: number;
}

export interface CapitalPoolsBreakdown {
  usEtfValueSgd: number;
  usStockValueSgd: number;
  sgStockValueSgd: number;
  optionsValueSgd: number;
  tradingCashSgd: number;
  cryptoHoldingsSgd: number;
  cryptoCashSgd: number;
  tradingCapital: number;
  cryptoCapital: number;
  myPortfolioValue: number;
  clientInitialCapital: number;
  clientCurrentValue: number;
  clientPnl: number;
  clientReturnPct: number;
  totalAssetsManaged: number;
  cash: CashBreakdown;
}

export function calculateClientCurrentValue(
  summary: ClientProfitSharingSummary
): number {
  return buildClientCapitalMetrics(summary).clientCurrentValue;
}

export function buildCapitalPoolsBreakdown(input: {
  holdings: HoldingInput[];
  cryptoRows: CryptoTrackerRow[];
  usEtfValueSgd: number;
  usStockValueSgd: number;
  sgStockValueSgd: number;
  openTrades: EnrichedTrade[];
  clientSummary: ClientProfitSharingSummary;
  tradeAllocations: TradeAllocationRow[];
  fxRate?: number;
}): CapitalPoolsBreakdown {
  const tradingCash = extractTradingCash(input.holdings);
  const { cryptoHoldingsSgd, cryptoCashSgd } = splitCryptoTrackerValues(
    input.cryptoRows
  );

  const personalOpenTrades = input.openTrades.filter((t) => !t.isClientTrade);
  const optionsValueSgd = personalOpenTrades.reduce(
    (s, t) => s + t.calculations.currentCloseCost,
    0
  );

  const tradingCapital =
    input.usEtfValueSgd +
    input.usStockValueSgd +
    input.sgStockValueSgd +
    tradingCash.tradingCashSgd +
    optionsValueSgd;

  const cryptoCapital = cryptoHoldingsSgd + cryptoCashSgd;
  const myPortfolioValue = tradingCapital + cryptoCapital;
  const clientMetrics = buildClientCapitalMetrics(input.clientSummary);
  const clientCurrentValue = clientMetrics.clientCurrentValue;

  const cash: CashBreakdown = {
    tradingCashSgd: tradingCash.tradingCashSgd,
    brokerUsdCashNative: tradingCash.brokerUsdCashNative,
    brokerUsdCashSgdEquivalent: tradingCash.brokerUsdCashSgdEquivalent,
    brokerSgdCash: tradingCash.brokerSgdCash,
    cryptoCashSgd,
    totalCashSgd: tradingCash.tradingCashSgd + cryptoCashSgd,
    availableForStocksSgd: tradingCash.tradingCashSgd,
    availableForEtfsSgd: tradingCash.tradingCashSgd,
    availableForOptionsSgd: tradingCash.tradingCashSgd,
    availableForCryptoSgd: cryptoCashSgd,
  };

  return {
    usEtfValueSgd: input.usEtfValueSgd,
    usStockValueSgd: input.usStockValueSgd,
    sgStockValueSgd: input.sgStockValueSgd,
    optionsValueSgd,
    tradingCashSgd: tradingCash.tradingCashSgd,
    cryptoHoldingsSgd,
    cryptoCashSgd,
    tradingCapital,
    cryptoCapital,
    myPortfolioValue,
    clientInitialCapital: clientMetrics.clientInitialCapital,
    clientCurrentValue,
    clientPnl: clientMetrics.clientPnl,
    clientReturnPct: clientMetrics.clientReturnPct,
    totalAssetsManaged: myPortfolioValue + clientCurrentValue,
    cash,
  };
}
