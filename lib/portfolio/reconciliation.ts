import type { PortfolioOverrideInput, PortfolioValueComparison } from "./types";
import type { CapitalPoolsBreakdown } from "./capital-pools";
import {
  buildCryptoPortfolioValueSgd,
  buildPortfolioValueSgd,
  type PortfolioValueComponents,
} from "./cash-architecture";
import {
  hasManualBreakdownInputs,
  manualBreakdownFromOverride,
  resolveManualSgComponents,
  sumManualOverallPortfolioValueSgd,
  sumManualTradingCapitalSgd,
} from "./manual-breakdown";

/** Tracker-module portfolio sum (incl. Trading Cash SGD + Crypto Value). */
export function buildAppCalculatedPortfolioValue(
  input: PortfolioValueComponents
): number {
  return buildPortfolioValueSgd(input);
}

function hasManualReconciliationInputs(
  override: PortfolioOverrideInput
): boolean {
  return hasManualBreakdownInputs(override);
}

function usesManualSectionInputs(
  override: PortfolioOverrideInput | null | undefined
): boolean {
  return hasManualBreakdownInputs(override);
}

/**
 * Active portfolio value from entered manual sections.
 * Crypto value is computed from coin rows + exchange cash — not a manual input.
 */
export function buildSectionPortfolioValueSgd(
  input: PortfolioValueComponents & {
    portfolioOverride?: PortfolioOverrideInput | null;
  }
): number {
  const override = input.portfolioOverride;

  if (!usesManualSectionInputs(override)) {
    return buildPortfolioValueSgd(input);
  }

  const breakdown = manualBreakdownFromOverride(override);
  const sg = resolveManualSgComponents(override);
  const tradingCashSgd =
    breakdown.tradingCashSgd ?? input.tradingCashSgd;

  const computedCryptoValueSgd = buildCryptoPortfolioValueSgd(
    input.cryptoHoldingsSgd,
    override != null ? override.manualCryptoCashSgd : input.cryptoCashSgd
  );

  const manualOverall = sumManualOverallPortfolioValueSgd({
    ...breakdown,
    cryptoValueSgd: computedCryptoValueSgd,
    sgStocksValueSgd: sg.sgStocksValueSgd,
    tradingCashSgd,
  });
  if (manualOverall != null) {
    return manualOverall;
  }

  const usStockEtf =
    override!.manualUsStocksOptionsSgdEquivalent ??
    input.usEtfValueSgd + input.usStockValueSgd;
  const sgStockEtf = sg.sgStocksValueSgd || input.sgStockValueSgd;
  const options =
    override!.manualUsStocksOptionsSgdEquivalent != null
      ? 0
      : input.optionsValueSgd;

  return buildPortfolioValueSgd({
    usEtfValueSgd: usStockEtf,
    usStockValueSgd: 0,
    sgStockValueSgd: sgStockEtf,
    optionsValueSgd: options,
    cryptoValueSgd: computedCryptoValueSgd,
    cryptoHoldingsSgd: input.cryptoHoldingsSgd,
    cryptoCashSgd: input.cryptoCashSgd,
    tradingCashSgd,
  });
}

/** Manual trading capital from override fields (excludes crypto). */
export function buildSectionTradingCapitalSgd(
  input: PortfolioValueComponents & {
    portfolioOverride?: PortfolioOverrideInput | null;
  }
): number | null {
  const override = input.portfolioOverride;
  if (!usesManualSectionInputs(override)) return null;

  const breakdown = manualBreakdownFromOverride(override);
  const sg = resolveManualSgComponents(override);
  const tradingCashSgd =
    breakdown.tradingCashSgd ?? input.tradingCashSgd;

  return sumManualTradingCapitalSgd({
    ...breakdown,
    sgStocksValueSgd: sg.sgStocksValueSgd,
    tradingCashSgd,
  });
}

/**
 * Broker-reported overall (SGD) for legacy reference — manual total when set.
 */
export function resolveBrokerReferencePortfolioValueSgd(
  override: PortfolioOverrideInput | null | undefined
): number | null {
  if (!override?.useManualOverride) return null;

  if (override.manualTotalPortfolioValueSgd != null) {
    return override.manualTotalPortfolioValueSgd;
  }

  if (!hasManualReconciliationInputs(override)) return null;

  const breakdown = manualBreakdownFromOverride(override);
  const sg = resolveManualSgComponents(override);
  return sumManualOverallPortfolioValueSgd({
    ...breakdown,
    sgStocksValueSgd: sg.sgStocksValueSgd,
  });
}

/** @deprecated Use resolveBrokerReferencePortfolioValueSgd */
export const resolveManualOverallPortfolioValueSgd =
  resolveBrokerReferencePortfolioValueSgd;

export function resolveActivePortfolioValueSgd(
  sectionPortfolioValueSgd: number
): number {
  return sectionPortfolioValueSgd;
}

export type PortfolioValueSource = "sections" | "app";

export function resolvePortfolioValueSource(
  override: PortfolioOverrideInput | null | undefined,
  brokerReferencePortfolioValueSgd: number | null
): PortfolioValueSource {
  if (usesManualSectionInputs(override) || brokerReferencePortfolioValueSgd != null) {
    return "sections";
  }
  return "app";
}

export function buildPortfolioComparisonFromPools(
  pools: CapitalPoolsBreakdown,
  override: PortfolioOverrideInput | null,
  legacyComparison: PortfolioValueComparison
): PortfolioValueComparison {
  const brokerRef = pools.brokerReferencePortfolioValueSgd;
  return {
    ...legacyComparison,
    overallPortfolioValueSgd: brokerRef,
    calculatedOverallPortfolioValueSgd: pools.totalPortfolioSgd,
    differenceSgd:
      brokerRef != null ? brokerRef - pools.totalPortfolioSgd : null,
    useManualOverride: override?.useManualOverride ?? false,
  };
}
