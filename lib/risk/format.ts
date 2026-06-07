import type { RiskZone } from "./constants";
import type { StressTestStatus } from "./capital-liquidity";

export function formatRiskCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRiskPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function riskZoneLabel(zone: RiskZone): string {
  switch (zone) {
    case "safe":
      return "Safe Zone";
    case "caution":
      return "Caution Zone";
    case "danger":
      return "Danger Zone";
  }
}

export function riskZoneClass(zone: RiskZone): string {
  switch (zone) {
    case "safe":
      return "text-profit";
    case "caution":
      return "text-warning";
    case "danger":
      return "text-loss";
  }
}

export function formatLiquidityRatio(ratio: number): string {
  if (!Number.isFinite(ratio)) return "∞";
  return ratio.toFixed(2);
}

export function stressTestLabel(status: StressTestStatus): string {
  switch (status) {
    case "comfortable":
      return "Comfortable";
    case "tight":
      return "Tight Liquidity";
    case "underfunded":
      return "Underfunded";
  }
}

export function stressTestClass(status: StressTestStatus): string {
  switch (status) {
    case "comfortable":
      return "text-profit";
    case "tight":
      return "text-warning";
    case "underfunded":
      return "text-loss";
  }
}
