import type { AveragePriceComparison, Direction } from "./types";

/** Average Price = (High + Low) / 2 */
export function calculateAveragePrice(high: number, low: number): number {
  return (high + low) / 2;
}

export function calculateAveragePriceChangePct(
  todayAverage: number,
  previousAverage: number
): number {
  if (previousAverage <= 0) return 0;
  return ((todayAverage - previousAverage) / previousAverage) * 100;
}

export function getDirection(
  difference: number,
  flatThreshold = 0.0001
): Direction {
  if (Math.abs(difference) < flatThreshold) return "flat";
  return difference > 0 ? "up" : "down";
}

export function buildAveragePriceComparison(
  todayHigh: number,
  todayLow: number,
  previousHigh: number,
  previousLow: number
): AveragePriceComparison {
  const todayAverage = calculateAveragePrice(todayHigh, todayLow);
  const previousAverage = calculateAveragePrice(previousHigh, previousLow);
  const difference = todayAverage - previousAverage;
  const differencePct = calculateAveragePriceChangePct(
    todayAverage,
    previousAverage
  );

  return {
    todayAverage,
    previousAverage,
    difference,
    differencePct,
    direction: getDirection(difference),
  };
}
