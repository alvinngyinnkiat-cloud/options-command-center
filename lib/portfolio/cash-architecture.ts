/**
 * Cash and crypto architecture:
 * - Trading Cash SGD — Portfolio Value + Trading Capital
 * - Trading Cash USD — reference only
 * - Crypto Value SGD — one portfolio line (coins + stablecoins combined)
 * - Crypto Cash — breakdown only in crypto section; not added separately to Portfolio Value
 */

export interface PortfolioValueComponents {
  usEtfValueSgd: number;
  usStockValueSgd: number;
  sgStockValueSgd: number;
  optionsValueSgd: number;
  tradingCashSgd: number;
  /** Combined crypto (coins + stablecoins). When set, used directly — holdings/cash are not added again. */
  cryptoValueSgd?: number;
  /** Breakdown: all crypto assets including stablecoins. */
  cryptoHoldingsSgd: number;
  /** Breakdown: uninvested exchange fiat cash (SGD/USD on exchange). */
  cryptoCashSgd: number;
}

export interface TradingCapitalComponents {
  usEtfValueSgd: number;
  usStockValueSgd: number;
  sgStockValueSgd: number;
  tradingCashSgd: number;
  /** Options MTM — included for risk framework (PROJECT_RULES). */
  optionsValueSgd: number;
}

/** Crypto Portfolio Value = coin holdings total + crypto cash (breakdown / display). */
export function buildCryptoPortfolioValueSgd(
  cryptoHoldingsSgd: number,
  cryptoCashSgd: number
): number {
  return cryptoHoldingsSgd + cryptoCashSgd;
}

/** Resolve the single Crypto Value SGD line for Portfolio Value. */
export function resolveCryptoValueSgd(
  components: Pick<
    PortfolioValueComponents,
    "cryptoValueSgd" | "cryptoHoldingsSgd" | "cryptoCashSgd"
  >
): number {
  if (components.cryptoValueSgd != null) {
    return components.cryptoValueSgd;
  }
  return buildCryptoPortfolioValueSgd(
    components.cryptoHoldingsSgd,
    components.cryptoCashSgd
  );
}

/**
 * Portfolio Value =
 * US/SG stocks & ETFs + options + Trading Cash SGD + Crypto Value SGD
 *
 * Crypto Value SGD is one line (already includes coin holdings + crypto cash).
 */
export function buildPortfolioValueSgd(
  components: PortfolioValueComponents
): number {
  return (
    components.usEtfValueSgd +
    components.usStockValueSgd +
    components.sgStockValueSgd +
    components.optionsValueSgd +
    components.tradingCashSgd +
    resolveCryptoValueSgd(components)
  );
}

/**
 * Trading Capital = US/SG stocks & ETFs + Trading Cash SGD + options.
 * Excludes crypto value, crypto cash, and Trading Cash USD.
 */
export function buildTradingCapitalSgd(
  components: TradingCapitalComponents
): number {
  return (
    components.usEtfValueSgd +
    components.usStockValueSgd +
    components.sgStockValueSgd +
    components.tradingCashSgd +
    components.optionsValueSgd
  );
}

/** Sum of the two SGD cash buckets tracked for net worth (excludes USD reference). */
export function buildTotalCashSgd(
  tradingCashSgd: number,
  cryptoCashSgd: number
): number {
  return tradingCashSgd + cryptoCashSgd;
}
