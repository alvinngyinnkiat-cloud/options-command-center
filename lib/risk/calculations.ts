import {
  RISK_MAX_OPTIONS_ALLOCATION_PCT,
  RISK_MAX_RISK_PER_TRADE_PCT,
  RISK_UTILIZATION_CAUTION_MAX,
  RISK_UTILIZATION_SAFE_MAX,
  type RiskZone,
} from "./constants";

/** Portfolio Value × max options allocation % */
export function calculateMaximumOptionsCapital(
  portfolioValue: number,
  maxAllocationPct: number = RISK_MAX_OPTIONS_ALLOCATION_PCT
): number {
  return portfolioValue * (maxAllocationPct / 100);
}

/** Maximum Options Capital − Current Open Risk */
export function calculateAvailableRiskCapacity(
  maximumOptionsCapital: number,
  currentOpenRisk: number
): number {
  return Math.max(0, maximumOptionsCapital - currentOpenRisk);
}

/** Available Risk Capacity × max risk per trade % */
export function calculateMaximumRiskPerTrade(
  availableRiskCapacity: number,
  maxRiskPerTradePct: number = RISK_MAX_RISK_PER_TRADE_PCT
): number {
  return availableRiskCapacity * (maxRiskPerTradePct / 100);
}

/** Current Open Risk ÷ Maximum Options Capital × 100 */
export function calculateRiskUtilizationPct(
  currentOpenRisk: number,
  maximumOptionsCapital: number
): number {
  if (maximumOptionsCapital <= 0) return 0;
  return (currentOpenRisk / maximumOptionsCapital) * 100;
}

/** Options buying power used ÷ portfolio value × 100 */
export function calculateOptionsAllocationPct(
  totalBuyingPowerUsed: number,
  portfolioValue: number
): number {
  if (portfolioValue <= 0) return 0;
  return (totalBuyingPowerUsed / portfolioValue) * 100;
}

/** Position max risk ÷ maximum options capital × 100 */
export function calculatePositionRiskPct(
  positionMaxRisk: number,
  maximumOptionsCapital: number
): number {
  if (maximumOptionsCapital <= 0) return 0;
  return (positionMaxRisk / maximumOptionsCapital) * 100;
}

export function getRiskZone(utilizationPct: number): RiskZone {
  if (utilizationPct <= RISK_UTILIZATION_SAFE_MAX) return "safe";
  if (utilizationPct <= RISK_UTILIZATION_CAUTION_MAX) return "caution";
  return "danger";
}

export function buildRiskFramework(input: {
  portfolioValue: number;
  currentOpenRisk: number;
  maxAllocationPct?: number;
  maxRiskPerTradePct?: number;
}) {
  const maxAllocationPct =
    input.maxAllocationPct ?? RISK_MAX_OPTIONS_ALLOCATION_PCT;
  const maxRiskPerTradePct =
    input.maxRiskPerTradePct ?? RISK_MAX_RISK_PER_TRADE_PCT;

  const maximumOptionsCapital = calculateMaximumOptionsCapital(
    input.portfolioValue,
    maxAllocationPct
  );
  const availableRiskCapacity = calculateAvailableRiskCapacity(
    maximumOptionsCapital,
    input.currentOpenRisk
  );
  const maximumRiskPerTrade = calculateMaximumRiskPerTrade(
    availableRiskCapacity,
    maxRiskPerTradePct
  );
  const riskUtilizationPct = calculateRiskUtilizationPct(
    input.currentOpenRisk,
    maximumOptionsCapital
  );

  return {
    maximumOptionsCapital,
    availableRiskCapacity,
    maximumRiskPerTrade,
    riskUtilizationPct,
    riskZone: getRiskZone(riskUtilizationPct),
    maxAllocationPct,
    maxRiskPerTradePct,
  };
}

