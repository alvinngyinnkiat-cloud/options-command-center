import type { PortfolioOverrideInput } from "./types";

export interface ManualBreakdownComponents {
  usStocksOptionsSgdEquivalent: number | null;
  cryptoValueSgd: number | null;
  sgStocksValueSgd: number | null;
  sgCashValueSgd: number | null;
  tradingCashSgd: number | null;
}

export interface ManualSgComponents {
  sgStocksValueSgd: number;
  sgCashValueSgd: number;
  sgCombinedSgd: number;
}

/** Resolve SG stocks/cash from split fields or legacy combined column. */
export function resolveManualSgComponents(
  override: PortfolioOverrideInput | null | undefined
): ManualSgComponents {
  if (!override) {
    return { sgStocksValueSgd: 0, sgCashValueSgd: 0, sgCombinedSgd: 0 };
  }

  if (
    override.manualSgStocksValueSgd != null ||
    override.manualSgCashValueSgd != null
  ) {
    const sgStocksValueSgd = override.manualSgStocksValueSgd ?? 0;
    const sgCashValueSgd = override.manualSgCashValueSgd ?? 0;
    return {
      sgStocksValueSgd,
      sgCashValueSgd,
      sgCombinedSgd: sgStocksValueSgd + sgCashValueSgd,
    };
  }

  if (override.manualSgStocksCashValueSgd != null) {
    return {
      sgStocksValueSgd: override.manualSgStocksCashValueSgd,
      sgCashValueSgd: 0,
      sgCombinedSgd: override.manualSgStocksCashValueSgd,
    };
  }

  return { sgStocksValueSgd: 0, sgCashValueSgd: 0, sgCombinedSgd: 0 };
}

export function hasManualBreakdownInputs(
  override: PortfolioOverrideInput | null | undefined
): boolean {
  if (!override?.useManualOverride) return false;
  return (
    override.manualUsStocksOptionsSgdEquivalent != null ||
    override.manualCryptoValueSgd != null ||
    override.manualSgStocksValueSgd != null ||
    override.manualSgCashValueSgd != null ||
    override.manualSgStocksCashValueSgd != null ||
    override.manualTradingCashSgd != null
  );
}

/**
 * Overall Portfolio Value =
 * US SGD equivalent + Trading Cash SGD + Crypto Value + SG Stock Value
 */
export function sumManualOverallPortfolioValueSgd(
  components: ManualBreakdownComponents
): number | null {
  const {
    usStocksOptionsSgdEquivalent,
    cryptoValueSgd,
    sgStocksValueSgd,
    tradingCashSgd,
  } = components;

  if (
    usStocksOptionsSgdEquivalent == null &&
    cryptoValueSgd == null &&
    sgStocksValueSgd == null &&
    tradingCashSgd == null
  ) {
    return null;
  }

  return (
    (usStocksOptionsSgdEquivalent ?? 0) +
    (cryptoValueSgd ?? 0) +
    (sgStocksValueSgd ?? 0) +
    (tradingCashSgd ?? 0)
  );
}

/**
 * Trading Capital =
 * US SGD equivalent + Trading Cash SGD + SG Stock Value
 * Excludes crypto and Trading Cash USD.
 */
export function sumManualTradingCapitalSgd(
  components: ManualBreakdownComponents
): number | null {
  const {
    usStocksOptionsSgdEquivalent,
    sgStocksValueSgd,
    tradingCashSgd,
  } = components;

  if (
    usStocksOptionsSgdEquivalent == null &&
    sgStocksValueSgd == null &&
    tradingCashSgd == null
  ) {
    return null;
  }

  return (
    (usStocksOptionsSgdEquivalent ?? 0) +
    (sgStocksValueSgd ?? 0) +
    (tradingCashSgd ?? 0)
  );
}

export function manualBreakdownFromOverride(
  override: PortfolioOverrideInput | null | undefined
): ManualBreakdownComponents {
  const sg = resolveManualSgComponents(override);
  return {
    usStocksOptionsSgdEquivalent:
      override?.manualUsStocksOptionsSgdEquivalent ?? null,
    cryptoValueSgd: override?.manualCryptoValueSgd ?? null,
    sgStocksValueSgd:
      override?.manualSgStocksValueSgd != null ||
      override?.manualSgCashValueSgd != null ||
      override?.manualSgStocksCashValueSgd != null
        ? sg.sgStocksValueSgd
        : null,
    sgCashValueSgd:
      override?.manualSgStocksValueSgd != null ||
      override?.manualSgCashValueSgd != null
        ? sg.sgCashValueSgd
        : null,
    tradingCashSgd: override?.manualTradingCashSgd ?? null,
  };
}
