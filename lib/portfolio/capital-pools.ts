import type { ClientProfitSharingSummary } from "@/lib/client-profit-sharing/types";
import type { TradeAllocationRow } from "@/lib/client-profit-sharing/types";
import { buildClientCapitalMetrics } from "./client-capital";
import type { EnrichedCryptoHolding } from "@/lib/crypto/types";
import type { CryptoHolding } from "@/types/database";
import type { EnrichedTrade } from "@/lib/trades/types";
import type { HoldingInput, PortfolioOverrideInput } from "./types";
import {
  buildCryptoPortfolioValueSgd,
  buildTotalCashSgd,
  buildTradingCapitalSgd,
} from "./cash-architecture";
import { buildPortfolioOwnershipSplit } from "./ownership-split";
import {
  buildAppCalculatedPortfolioValue,
  buildSectionPortfolioValueSgd,
  buildSectionTradingCapitalSgd,
  resolveActivePortfolioValueSgd,
  resolveBrokerReferencePortfolioValueSgd,
  resolvePortfolioValueSource,
  type PortfolioValueSource,
} from "./reconciliation";

/** Stablecoins are coin holdings — never classified as crypto cash. */
const STABLECOIN_TICKERS = new Set([
  "USDT",
  "USDC",
  "FDUSD",
  "TUSD",
  "DAI",
  "BUSD",
  "USDP",
  "GUSD",
  "STABLECOIN",
]);

/** Fiat exchange cash on a crypto exchange — not token holdings. */
const FIAT_EXCHANGE_CASH_TICKERS = new Set(["USD", "SGD", "CASH"]);

export function isStablecoinTicker(ticker: string): boolean {
  return STABLECOIN_TICKERS.has(ticker.toUpperCase());
}

/** True only for uninvested exchange fiat (SGD/USD cash), not stablecoins or coins. */
export function isCryptoCashAsset(
  ticker: string,
  assetLabel?: string | null
): boolean {
  const t = ticker.toUpperCase();
  const label = (assetLabel ?? ticker).toUpperCase();

  if (isStablecoinTicker(t) || label.includes("STABLE")) {
    return false;
  }

  if (FIAT_EXCHANGE_CASH_TICKERS.has(t)) {
    return true;
  }

  return (
    label.includes("EXCHANGE CASH") ||
    label.includes("FIAT CASH") ||
    (label.includes("FIAT") && label.includes("CASH"))
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

/** True when user has saved manual crypto cash or contributions. */
export function hasManualCryptoTotals(
  override: PortfolioOverrideInput | null | undefined
): boolean {
  if (!override) return false;
  return (
    override.manualCryptoContributionsSgd != null ||
    override.manualCryptoCashSgd > 0
  );
}

/** Manual exchange cash overrides tracker fiat-cash split when manual crypto totals exist. */
export function resolveCryptoCashSgd(
  override: PortfolioOverrideInput | null | undefined,
  splitFromTracker: number
): number {
  if (hasManualCryptoTotals(override)) {
    return override!.manualCryptoCashSgd ?? 0;
  }
  return splitFromTracker;
}

/** Coin holdings total — always summed from individual crypto tracker rows. */
export function resolveCryptoHoldingsSgd(
  _override: PortfolioOverrideInput | null | undefined,
  splitFromTracker: number
): number {
  return splitFromTracker;
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
  /** Coin holdings + crypto cash — included in Portfolio Value; excluded from Trading Capital. */
  cryptoPortfolioValueSgd: number;
  /** @deprecated Use cryptoPortfolioValueSgd */
  cryptoCapital: number;
  /** Tracker-module sum incl. Trading Cash SGD (comparison baseline). */
  appCalculatedValueSgd: number;
  /** Broker-reported overall (SGD) — reconciliation reference only. */
  brokerReferencePortfolioValueSgd: number | null;
  /** @deprecated Use brokerReferencePortfolioValueSgd */
  manualOverallPortfolioValueSgd: number | null;
  portfolioValueDifferenceSgd: number | null;
  portfolioValueSource: PortfolioValueSource;
  tradingCapital: number;
  /** Section total: US/SG + options + Crypto Value + Trading Cash SGD. */
  totalPortfolioSgd: number;
  /** Manual client-owned slice (SGD). */
  clientPortfolioSgd: number;
  /** Personal slice = totalPortfolioSgd − clientPortfolioSgd. */
  myPortfolioValue: number;
  clientOwnershipPct: number;
  myOwnershipPct: number;
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
  portfolioOverride?: PortfolioOverrideInput | null;
  cryptoCashSgdOverride?: number | null;
  cryptoHoldingsSgdOverride?: number | null;
}): CapitalPoolsBreakdown {
  const tradingCash = resolveTradingCash(
    input.manualTradingCash,
    input.holdings
  );
  const splitCrypto = splitCryptoTrackerValues(input.cryptoRows);
  const cryptoHoldingsSgd = resolveCryptoHoldingsSgd(
    input.portfolioOverride,
    input.cryptoHoldingsSgdOverride ?? splitCrypto.cryptoHoldingsSgd
  );
  const cryptoCashSgd = resolveCryptoCashSgd(
    input.portfolioOverride,
    input.cryptoCashSgdOverride ?? splitCrypto.cryptoCashSgd
  );

  const personalOpenTrades = input.openTrades.filter((t) => !t.isClientTrade);
  const optionsValueSgd = personalOpenTrades.reduce(
    (s, t) => s + t.calculations.currentCloseCost,
    0
  );

  const cryptoPortfolioValueSgd = buildCryptoPortfolioValueSgd(
    cryptoHoldingsSgd,
    cryptoCashSgd
  );

  const portfolioComponents = {
    usEtfValueSgd: input.usEtfValueSgd,
    usStockValueSgd: input.usStockValueSgd,
    sgStockValueSgd: input.sgStockValueSgd,
    optionsValueSgd,
    cryptoHoldingsSgd,
    cryptoCashSgd,
    cryptoValueSgd: cryptoPortfolioValueSgd,
    tradingCashSgd: tradingCash.tradingCashSgd,
  };

  const tradingCapitalFromSections = buildSectionTradingCapitalSgd({
    ...portfolioComponents,
    portfolioOverride: input.portfolioOverride,
  });
  const tradingCapital =
    tradingCapitalFromSections ??
    buildTradingCapitalSgd({
      usEtfValueSgd: input.usEtfValueSgd,
      usStockValueSgd: input.usStockValueSgd,
      sgStockValueSgd: input.sgStockValueSgd,
      tradingCashSgd: tradingCash.tradingCashSgd,
      optionsValueSgd,
    });

  const appCalculatedValueSgd = buildAppCalculatedPortfolioValue(portfolioComponents);

  const brokerReferencePortfolioValueSgd =
    resolveBrokerReferencePortfolioValueSgd(input.portfolioOverride);
  const totalPortfolioSgd = resolveActivePortfolioValueSgd(
    buildSectionPortfolioValueSgd({
      ...portfolioComponents,
      portfolioOverride: input.portfolioOverride,
    })
  );
  const ownership = buildPortfolioOwnershipSplit(
    totalPortfolioSgd,
    input.portfolioOverride?.manualClientPortfolioSgd
  );
  const portfolioValueSource = resolvePortfolioValueSource(
    input.portfolioOverride,
    brokerReferencePortfolioValueSgd
  );
  const portfolioValueDifferenceSgd =
    brokerReferencePortfolioValueSgd != null
      ? brokerReferencePortfolioValueSgd - totalPortfolioSgd
      : null;

  const clientMetrics = buildClientCapitalMetrics(input.clientSummary);
  const clientCurrentValue = clientMetrics.clientCurrentValue;

  const cash: CashBreakdown = {
    tradingCashSgd: tradingCash.tradingCashSgd,
    brokerUsdCashNative: tradingCash.brokerUsdCashNative,
    brokerSgdCash: tradingCash.brokerSgdCash,
    cryptoCashSgd,
    totalCashSgd: buildTotalCashSgd(tradingCash.tradingCashSgd, cryptoCashSgd),
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
    appCalculatedValueSgd,
    brokerReferencePortfolioValueSgd,
    manualOverallPortfolioValueSgd: brokerReferencePortfolioValueSgd,
    portfolioValueDifferenceSgd,
    portfolioValueSource,
    tradingCapital,
    cryptoPortfolioValueSgd,
    cryptoCapital: cryptoPortfolioValueSgd,
    totalPortfolioSgd: ownership.totalPortfolioSgd,
    clientPortfolioSgd: ownership.clientPortfolioSgd,
    myPortfolioValue: ownership.myPortfolioSgd,
    clientOwnershipPct: ownership.clientOwnershipPct,
    myOwnershipPct: ownership.myOwnershipPct,
    clientInitialCapital: clientMetrics.clientInitialCapital,
    clientCurrentValue,
    clientPnl: clientMetrics.clientPnl,
    clientReturnPct: clientMetrics.clientReturnPct,
    totalAssetsManaged: ownership.totalPortfolioSgd + clientCurrentValue,
    cash,
  };
}
