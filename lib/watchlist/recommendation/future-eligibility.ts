import type { RecommendationInput, StrategyRuleEvaluation } from "./types";
import { evaluateBearCallRecommendation } from "./bear-call";
import { evaluateBullPutRecommendation } from "./bull-put";

export interface FutureStrategyEligibility {
  sellPutEligible: boolean;
  sellCallEligible: boolean;
  sellPutReason: string;
  sellCallReason: string;
}

export function evaluateFutureStrategyEligibility(
  input: RecommendationInput,
  bullPutEval: StrategyRuleEvaluation,
  bearCallEval: StrategyRuleEvaluation
): FutureStrategyEligibility {
  const usdCash = input.usdCashNative ?? null;
  const sharesOwned = input.sharesOwned ?? null;
  const proxyStrike = input.support;

  let sellPutEligible = false;
  let sellPutReason = "Not eligible — Bull Put setup did not pass";

  if (bullPutEval.passesAll) {
    if (usdCash == null) {
      sellPutReason =
        "Bull Put setup passed — USD cash not available for assignment check";
    } else if (proxyStrike == null) {
      sellPutReason =
        "Bull Put setup passed — enter manual support to estimate assignment cash";
    } else {
      const requiredCash = proxyStrike * 100;
      sellPutEligible = usdCash >= requiredCash;
      sellPutReason = sellPutEligible
        ? `Sell Put Eligible — Bull Put setup passed, USD cash covers ~1-lot assignment at support ($${requiredCash.toFixed(0)})`
        : `Not eligible — need $${requiredCash.toFixed(0)} USD cash for assignment (have $${usdCash.toFixed(0)})`;
    }
  }

  let sellCallEligible = false;
  let sellCallReason = "Not eligible — Bear Call setup did not pass";

  if (bearCallEval.passesAll) {
    if (sharesOwned == null) {
      sellCallReason =
        "Bear Call setup passed — share count not available for covered call check";
    } else if (sharesOwned >= 100) {
      sellCallEligible = true;
      sellCallReason = `Sell Call Eligible — Bear Call setup passed, ${sharesOwned} shares owned (≥ 100)`;
    } else {
      sellCallReason = `Not eligible — need 100 shares for covered call (have ${sharesOwned})`;
    }
  }

  return {
    sellPutEligible,
    sellCallEligible,
    sellPutReason,
    sellCallReason,
  };
}
