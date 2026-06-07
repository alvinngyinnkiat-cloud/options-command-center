import { describe, expect, it } from "vitest";
import {
  getNextReviewDueDate,
  getReviewDate,
  getWeekEndingForReview,
  isReviewDue,
} from "./dates";

describe("weekend review dates", () => {
  it("uses prior Friday as week ending on Saturday", () => {
    expect(getWeekEndingForReview(new Date("2026-06-07T10:00:00"))).toBe(
      "2026-06-05"
    );
  });

  it("returns review date as calendar day", () => {
    expect(getReviewDate(new Date("2026-06-07T10:00:00"))).toBe("2026-06-07");
  });

  it("schedules next review on the following Saturday", () => {
    expect(getNextReviewDueDate("2026-05-31")).toBe("2026-06-06");
  });

  it("marks review due when past next date", () => {
    expect(
      isReviewDue("2026-05-24", "2026-05-31", new Date("2026-06-01T10:00:00"))
    ).toBe(true);
  });
});
