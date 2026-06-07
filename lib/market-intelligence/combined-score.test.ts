import { describe, expect, it } from "vitest";
import { computeCombinedScore } from "./combined-score";
import { COMBINED_WEIGHTS } from "./constants";

describe("combined score", () => {
  it("applies 75/25 weighting", () => {
    const result = computeCombinedScore(80, 60);
    expect(result.combinedScore).toBe(
      Math.round(80 * COMBINED_WEIGHTS.technical + 60 * COMBINED_WEIGHTS.intelligence)
    );
    expect(result.combinedScore).toBe(75);
  });

  it("defaults intelligence to neutral 50", () => {
    const result = computeCombinedScore(100);
    expect(result.combinedScore).toBe(88);
  });
});
