import { getDirection } from "./average-price";
import type {
  IndicatorComparison,
  PreviousTechnicalIndicatorFields,
  TechnicalComparisons,
  TechnicalIndicatorFields,
} from "./types";

function buildSingleComparison(
  today: number,
  previous: number | null | undefined
): IndicatorComparison {
  if (previous == null) {
    return {
      today,
      previous: null,
      difference: null,
      differencePct: null,
      direction: null,
      available: false,
    };
  }

  const difference = today - previous;
  const differencePct =
    previous !== 0 ? (difference / previous) * 100 : difference === 0 ? 0 : null;

  return {
    today,
    previous,
    difference,
    differencePct,
    direction: getDirection(difference),
    available: true,
  };
}

export function buildTechnicalComparisons(
  today: TechnicalIndicatorFields,
  previous: PreviousTechnicalIndicatorFields | null
): TechnicalComparisons {
  return {
    atr14: buildSingleComparison(today.atr14, previous?.atr14),
    ema20: buildSingleComparison(today.ema20, previous?.ema20),
    sma50: buildSingleComparison(today.sma50, previous?.sma50),
    sma200: buildSingleComparison(today.sma200, previous?.sma200),
    stochastic: buildSingleComparison(today.stochastic, previous?.stochastic),
  };
}
