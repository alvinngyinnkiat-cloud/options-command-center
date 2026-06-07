export function calculateIncomeYieldPct(
  annualPassiveIncome: number,
  capitalDeployed: number
): number {
  if (capitalDeployed <= 0) return 0;
  return (annualPassiveIncome / capitalDeployed) * 100;
}

export function calculateAdjustedCostBasisUs(
  originalCostBasis: number,
  premiumCollected: number,
  dividendIncome: number
): number {
  return Math.max(0, originalCostBasis - premiumCollected - dividendIncome);
}

export function calculateAdjustedCostBasisSg(
  originalCostBasis: number,
  dividendIncome: number
): number {
  return Math.max(0, originalCostBasis - dividendIncome);
}

export function calculateNetPositionPnl(
  currentValue: number,
  adjustedCostBasis: number
): number {
  return currentValue - adjustedCostBasis;
}

export function calculateRoiPct(totalPnl: number, capitalDeployed: number): number {
  if (capitalDeployed <= 0) return 0;
  return (totalPnl / capitalDeployed) * 100;
}
