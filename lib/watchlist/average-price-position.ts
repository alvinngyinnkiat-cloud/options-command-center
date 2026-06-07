import type { AveragePricePosition, AveragePricePositionZone } from "./types";

/** (Average Price - Support1) / (Resistance1 - Support1) × 100 */
export function calculateAveragePricePositionPct(
  averagePrice: number,
  support1: number | null,
  resistance1: number | null
): number | null {
  if (support1 == null || resistance1 == null) return null;
  const range = resistance1 - support1;
  if (range <= 0) return null;
  const raw = ((averagePrice - support1) / range) * 100;
  return Math.min(100, Math.max(0, raw));
}

export function getAveragePricePositionZone(
  positionPct: number
): AveragePricePositionZone {
  if (positionPct <= 33) return "support";
  if (positionPct >= 67) return "resistance";
  return "mid";
}

export function formatAveragePricePositionLabel(positionPct: number): string {
  if (positionPct <= 5) return "At Support";
  if (positionPct >= 95) return "At Resistance";
  if (positionPct >= 45 && positionPct <= 55) return "Mid Range";
  return `${positionPct.toFixed(0)}%`;
}

export function buildAveragePricePosition(
  averagePrice: number,
  support1: number | null,
  resistance1: number | null
): AveragePricePosition {
  const positionPct = calculateAveragePricePositionPct(
    averagePrice,
    support1,
    resistance1
  );

  if (positionPct == null) {
    return {
      positionPct: null,
      zone: null,
      label: "—",
    };
  }

  return {
    positionPct,
    zone: getAveragePricePositionZone(positionPct),
    label: formatAveragePricePositionLabel(positionPct),
  };
}
