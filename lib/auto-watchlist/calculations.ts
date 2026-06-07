/** (Current − 52W High) / 52W High × 100 — negative when below high */
export function calculateDistanceFromHighPercent(
  currentPrice: number,
  fiftyTwoWeekHigh: number
): number {
  if (fiftyTwoWeekHigh <= 0) return 0;
  return ((currentPrice - fiftyTwoWeekHigh) / fiftyTwoWeekHigh) * 100;
}

/** (Current − 52W Low) / 52W Low × 100 — positive when above low */
export function calculateDistanceFromLowPercent(
  currentPrice: number,
  fiftyTwoWeekLow: number
): number {
  if (fiftyTwoWeekLow <= 0) return 0;
  return ((currentPrice - fiftyTwoWeekLow) / fiftyTwoWeekLow) * 100;
}

export function enrichSnapshotMetrics(snapshot: {
  currentPrice: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}): {
  distanceFromHighPercent: number;
  distanceFromLowPercent: number;
} {
  return {
    distanceFromHighPercent: calculateDistanceFromHighPercent(
      snapshot.currentPrice,
      snapshot.fiftyTwoWeekHigh
    ),
    distanceFromLowPercent: calculateDistanceFromLowPercent(
      snapshot.currentPrice,
      snapshot.fiftyTwoWeekLow
    ),
  };
}
