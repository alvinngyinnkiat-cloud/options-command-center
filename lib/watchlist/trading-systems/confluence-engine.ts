import type {
  ConfluenceResult,
  EmaReversalSystemResult,
  MainTradingSystemResult,
} from "./types";

function isRecommended(rec: string): boolean {
  return rec !== "No Trade";
}

/** System 3 — informational confluence between 20 EMA and Main (never affects decisions). */
export function computeConfluence(
  ema: EmaReversalSystemResult,
  main: MainTradingSystemResult
): ConfluenceResult {
  const emaRec = ema.recommendation;
  const mainRec = main.recommendation;
  const emaActive = isRecommended(emaRec);
  const mainActive = isRecommended(mainRec);

  if (emaActive && mainActive) {
    return {
      status: "Both Systems Agree",
      reason: `20 EMA ${emaRec}; Main ${mainRec}`,
    };
  }

  if (emaActive || mainActive) {
    const active = emaActive
      ? `20 EMA ${emaRec}`
      : `Main ${mainRec}`;
    const idle = emaActive ? "Main No Trade" : "20 EMA No Trade";
    return {
      status: "One System Agree",
      reason: `${active}; ${idle}`,
    };
  }

  return {
    status: "No System Agree",
    reason: "Both systems: No Trade",
  };
}
