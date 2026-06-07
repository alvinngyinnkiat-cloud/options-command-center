import { describe, expect, it } from "vitest";
import {
  formatDteLabel,
  getDteReviewLabel,
  getDteTone,
} from "./dte-display";

describe("dte display", () => {
  it("formats DTE label", () => {
    expect(formatDteLabel(32)).toBe("DTE 32");
  });

  it("assigns DTE tone colors", () => {
    expect(getDteTone(45)).toBe("comfort");
    expect(getDteTone(21)).toBe("caution");
    expect(getDteTone(14)).toBe("caution");
    expect(getDteTone(13)).toBe("danger");
  });

  it("shows review warnings by DTE", () => {
    expect(getDteReviewLabel(20)).toBeNull();
    expect(getDteReviewLabel(10)).toBe("REVIEW POSITION");
    expect(getDteReviewLabel(5)).toBe("URGENT REVIEW");
  });
});
