/** ATR-adjusted S/R zones for Bull Put safe-zone scoring. */
export function calculateAdjustedSupport(
  support1: number,
  atr14: number
): number {
  return support1 + atr14;
}

export function calculateAdjustedResistance(
  resistance1: number,
  atr14: number
): number {
  return resistance1 - atr14;
}

export interface AdjustedSupportResistanceLevels {
  support1: number;
  resistance1: number;
  atr14: number;
  adjustedSupport: number;
  adjustedResistance: number;
}

export function buildAdjustedSupportResistanceLevels(
  support1: number | null,
  resistance1: number | null,
  atr14: number
): AdjustedSupportResistanceLevels | null {
  if (support1 == null || resistance1 == null || atr14 <= 0) return null;
  return {
    support1,
    resistance1,
    atr14,
    adjustedSupport: calculateAdjustedSupport(support1, atr14),
    adjustedResistance: calculateAdjustedResistance(resistance1, atr14),
  };
}

export function scoreBullPutAdjustedZone(
  price: number,
  support: number,
  resistance: number,
  atr14: number,
  maxScore: number,
  label = "daily"
): { score: number; passed: boolean; reason: string } {
  const adjustedSupport = calculateAdjustedSupport(support, atr14);
  const adjustedResistance = calculateAdjustedResistance(resistance, atr14);

  if (price <= support || price >= resistance) {
    return {
      score: 0,
      passed: false,
      reason: `${label}: price outside manual S/R range (${support.toFixed(2)}–${resistance.toFixed(2)})`,
    };
  }

  if (price > adjustedSupport && price < adjustedResistance) {
    return {
      score: maxScore,
      passed: true,
      reason: `${label}: price in ATR-adjusted safe zone (${adjustedSupport.toFixed(2)}–${adjustedResistance.toFixed(2)})`,
    };
  }

  return {
    score: Math.round(maxScore / 2),
    passed: true,
    reason: `${label}: inside S/R but in outer ATR buffer (adj S ${adjustedSupport.toFixed(2)}, adj R ${adjustedResistance.toFixed(2)})`,
  };
}
