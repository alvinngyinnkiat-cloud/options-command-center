import type { TradingSystemsInput, TradingSystemsResult } from "./types";
import { computeEmaReversalSystem } from "./ema-reversal-system";
import { computeMainTradingSystem } from "./main-trading-system";
import { computeConfluence } from "./confluence-engine";

function buildDecisionReason(result: Omit<TradingSystemsResult, "decisionReason">): string {
  const { emaSystem, mainSystem, confluence } = result;
  return [
    `20 EMA: ${emaSystem.recommendation} (${emaSystem.emaScore}) — ${emaSystem.reason}`,
    `Main: ${mainSystem.recommendation} (${mainSystem.strategyFitScore}) — ${mainSystem.reason}`,
    `Confluence — ${confluence.status}`,
  ].join(" | ");
}

export function computeTradingSystems(
  input: TradingSystemsInput
): TradingSystemsResult {
  const emaSystem = computeEmaReversalSystem(input);
  const mainSystem = computeMainTradingSystem(input);
  const confluence = computeConfluence(emaSystem, mainSystem);

  const partial = { emaSystem, mainSystem, confluence };
  return {
    ...partial,
    decisionReason: buildDecisionReason(partial),
  };
}

export type {
  TradingSystemsInput,
  TradingSystemsResult,
  TradingSystemRecommendation,
  ConfluenceStatus,
  StrategyFitTier,
} from "./types";

export { computeEmaReversalSystem } from "./ema-reversal-system";
export { computeMainTradingSystem } from "./main-trading-system";
export { computeConfluence } from "./confluence-engine";
