import type { TradingSystemsInput, TradingSystemsResult } from "./types";
import { computeEmaReversalSystem } from "./ema-reversal-system";
import { computeMainTradingSystem } from "./main-trading-system";
import { computeConfluence } from "./confluence-engine";

export function computeTradingSystems(
  input: TradingSystemsInput
): TradingSystemsResult {
  const emaSystem = computeEmaReversalSystem(input);
  const mainSystem = computeMainTradingSystem(input);
  const confluence = computeConfluence(emaSystem, mainSystem);

  return { emaSystem, mainSystem, confluence };
}

export type {
  TradingSystemsInput,
  TradingSystemsResult,
  TradingSystemRecommendation,
  ConfluenceStatus,
  ConfluenceTier,
} from "./types";

export { computeEmaReversalSystem } from "./ema-reversal-system";
export { computeMainTradingSystem } from "./main-trading-system";
export { computeConfluence } from "./confluence-engine";
