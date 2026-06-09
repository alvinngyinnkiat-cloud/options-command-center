import { describe, expect, it } from "vitest";
import {
  DAILY_AUTO_REFRESH_LABEL,
  formatNextScheduledRefresh,
  formatSgtAuditTimestamp,
  formatSgtDateTime,
  formatSgtHeaderClock,
  formatSgtWithEtReference,
  getNextScheduledRefreshAt,
} from "@/lib/time/singapore-time";

describe("singapore-time", () => {
  it("formats audit timestamps in 12-hour SGT with seconds", () => {
    expect(formatSgtAuditTimestamp("2026-06-08T22:05:07.000Z")).toBe(
      "Jun 09, 2026 6:05:07 AM SGT"
    );
  });

  it("formats general datetime without seconds", () => {
    expect(formatSgtDateTime("2026-06-08T22:05:07.000Z")).toBe(
      "Jun 09, 2026 6:05 AM SGT"
    );
  });

  it("formats header clock lines", () => {
    const clock = formatSgtHeaderClock(new Date("2026-06-08T17:35:00.000Z"));
    expect(clock.dateLine).toBe("Jun 09, 2026");
    expect(clock.timeLine).toBe("1:35 AM SGT");
    expect(clock.dualTimeLine).toMatch(/SGT \| .* ET/);
  });

  it("shows SGT first and ET as secondary reference", () => {
    const line = formatSgtWithEtReference(new Date("2026-06-08T17:35:00.000Z"));
    expect(line).toBe("1:35 AM SGT | 1:35 PM ET");
  });

  it("computes next 6:00 AM SGT refresh", () => {
    const beforeSix = new Date("2026-06-08T21:00:00.000Z"); // Jun 09 5:00 AM SGT
    const nextBefore = getNextScheduledRefreshAt(beforeSix);
    expect(nextBefore.toISOString()).toBe("2026-06-08T22:00:00.000Z");

    const afterSix = new Date("2026-06-08T23:00:00.000Z"); // Jun 09 7:00 AM SGT
    const nextAfter = getNextScheduledRefreshAt(afterSix);
    expect(nextAfter.toISOString()).toBe("2026-06-09T22:00:00.000Z");
  });

  it("formats next scheduled refresh display", () => {
    const display = formatNextScheduledRefresh(
      new Date("2026-06-08T21:00:00.000Z")
    );
    expect(display.timeLine).toBe(DAILY_AUTO_REFRESH_LABEL);
    expect(display.combined).toContain("6:00 AM SGT");
  });
});
