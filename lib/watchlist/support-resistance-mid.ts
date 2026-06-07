/** Mid Point = (Support 1 + Resistance 1) / 2 — manual S/R only */
export function calculateMidPoint(
  support1: number | null,
  resistance1: number | null
): number | null {
  if (support1 == null || resistance1 == null) return null;
  return (support1 + resistance1) / 2;
}
