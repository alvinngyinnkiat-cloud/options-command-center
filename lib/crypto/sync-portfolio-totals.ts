import { splitCryptoTrackerValues } from "@/lib/portfolio/capital-pools";
import type { PortfolioOverrideInput } from "@/lib/portfolio/types";
import { buildCryptoPortfolioValueSgd } from "@/lib/portfolio/cash-architecture";
import type { CryptoHolding } from "@/types/database";

export function computeCryptoTotalsFromRows(
  rows: CryptoHolding[],
  cryptoCashSgd: number
): {
  cryptoHoldingsSgd: number;
  cryptoCashSgd: number;
  cryptoPortfolioValueSgd: number;
} {
  const { cryptoHoldingsSgd } = splitCryptoTrackerValues(rows);
  return {
    cryptoHoldingsSgd,
    cryptoCashSgd,
    cryptoPortfolioValueSgd: buildCryptoPortfolioValueSgd(
      cryptoHoldingsSgd,
      cryptoCashSgd
    ),
  };
}

export function applyComputedCryptoTotalsToOverride(
  override: PortfolioOverrideInput,
  rows: CryptoHolding[],
  cryptoCashSgd: number
): PortfolioOverrideInput {
  const totals = computeCryptoTotalsFromRows(rows, cryptoCashSgd);
  return {
    ...override,
    manualCryptoHoldingsSgd: totals.cryptoHoldingsSgd,
    manualCryptoCashSgd: totals.cryptoCashSgd,
    manualCryptoValueSgd: totals.cryptoPortfolioValueSgd,
    overrideUpdatedAt: new Date().toISOString(),
  };
}
