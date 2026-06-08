import type { ClientProfitSharingSummary } from "@/lib/client-profit-sharing/types";
import type { TradeAllocationRow } from "@/lib/client-profit-sharing/types";
import { buildClientCapitalMetrics } from "./client-capital";
import type { EnrichedCryptoHolding } from "@/lib/crypto/types";
import type { CryptoHolding } from "@/types/database";
import type { EnrichedTrade } from "@/lib/trades/types";
import type { HoldingInput, PortfolioOverrideInput } from "./types";

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

export interface ManualTradingCashInput {
  tradingCashUsd: number;
  tradingCashSgd: number;
}

export interface TradingCashBalances {
  /** Manual broker USD cash — reference only */
  brokerUsdCashNative: number;
  /** Manual Trading Cash SGD */
  brokerSgdCash: number;
  /** Same as brokerSgdCash — never includes USD converted to SGD */
  tradingCashSgd: number;
}

export function manualTradingCashFromOverride(
  override: PortfolioOverrideInput | null | undefined
): ManualTradingCashInput | null {
  if (!override) return null;
  const usd = override.manualTradingCashUsd;
  const sgd = override.manualTradingCashSgd;
  if (usd == null && sgd == null) return null;
  return {
    tradingCashUsd: usd ?? 0,
    tradingCashSgd: sgd ?? 0,
  };
}

/** Fallback from holdings when no manual override — SGD cash only for tradingCashSgd. */
export function extractTradingCash(holdings: HoldingInput[]): TradingCashBalances {
  let brokerUsdCashNative = 0;
  let brokerSgdCash = 0;

  for (const holding of holdings) {
    const ticker = holding.ticker.toUpperCase();
    if (ticker !== "CASH" && !ticker.startsWith("CASH.")) continue;

    if (holding.currency === "USD") {
      brokerUsdCashNative += holding.market_value_native;
    } else {
      brokerSgdCash += holding.market_value_sgd;
    }
  }

  return {
    brokerUsdCashNative,
    brokerSgdCash,
    tradingCashSgd: brokerSgdCash,
  };
}

export function resolveTradingCash(
  manual: ManualTradingCashInput | null | undefined,
  holdings: HoldingInput[]
): TradingCashBalances {
  if (manual) {
    return {
      brokerUsdCashNative: manual.tradingCashUsd,
      brokerSgdCash: manual.tradingCashSgd,
      tradingCashSgd: manual.tradingCashSgd,
    };
  }
  return extractTradingCash(holdings);
}

export interface CashBreakdown {
  tradingCashSgd: number;
  brokerUsdCashNative: number;
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
  manualTradingCash?: ManualTradingCashInput | null;
  cryptoCashSgdOverride?: number | null;
  cryptoHoldingsSgdOverride?: number | null;
}): CapitalPoolsBreakdown {
  const tradingCash = resolveTradingCash(
    input.manualTradingCash,
    input.holdings
  );
  const splitCrypto = splitCryptoTrackerValues(input.cryptoRows);
  const cryptoHoldingsSgd =
    input.cryptoHoldingsSgdOverride ?? splitCrypto.cryptoHoldingsSgd;
  const cryptoCashSgd =
    input.cryptoCashSgdOverride ?? splitCrypto.cryptoCashSgd;

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
