/** Manual position mode calculations — no transaction history required. */

export interface ManualPositionMetrics {
  assetPl: number;
  roiPct: number;
  plIncludingDividend: number;
}

export function calculateManualPositionMetrics(input: {
  currentValue: number;
  capitalInvested: number;
  totalDividend: number;
  totalFees: number;
}): ManualPositionMetrics {
  const { currentValue, capitalInvested, totalDividend, totalFees } = input;
  const assetPl = currentValue - capitalInvested;
  const roiPct =
    capitalInvested > 0 ? (assetPl / capitalInvested) * 100 : 0;
  const plIncludingDividend =
    currentValue + totalDividend - capitalInvested - totalFees;

  return { assetPl, roiPct, plIncludingDividend };
}
