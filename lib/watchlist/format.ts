import { formatNumber } from "@/lib/format/numbers";

export function formatPrice(value: number, decimals = 2): string {
  return formatNumber(value, decimals);
}

export function formatIndicator(value: number, decimals = 2): string {
  return formatPrice(value, decimals);
}

export function formatDistancePct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatStochastic(value: number): string {
  return value.toFixed(1);
}

export function formatScore(value: number): string {
  return value.toFixed(0);
}

export function formatScoreFraction(score: number, max: number): string {
  return `${score.toFixed(0)}/${max}`;
}

export function formatSignedPrice(value: number, decimals = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatPrice(value, decimals)}`;
}

export function formatDirectionLabel(direction: "up" | "down" | "flat"): string {
  switch (direction) {
    case "up":
      return "Up";
    case "down":
      return "Down";
    case "flat":
      return "Flat";
  }
}
