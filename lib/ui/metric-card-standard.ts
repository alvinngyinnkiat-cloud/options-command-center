/**
 * Platform-wide metric card layout standard.
 * Sized for 2-decimal currency values (e.g. US$105,892.44).
 */
export const METRIC_CARD_MIN_WIDTH = 220;

/** CSS grid template for responsive metric card rows. */
export function metricCardGridColumns(
  minWidth = METRIC_CARD_MIN_WIDTH
): string {
  return `repeat(auto-fit, minmax(min(100%, ${minWidth}px), 1fr))`;
}
