import { describe, expect, it } from "vitest";
import { getUsMarketSession } from "@/lib/time/us-market-session";

describe("us-market-session", () => {
  it("detects regular session during NYSE hours", () => {
    const session = getUsMarketSession(new Date("2026-06-09T15:00:00.000Z")); // 11:00 AM ET
    expect(session.label).toBe("US Regular Session");
    expect(session.session).toBe("regular");
  });

  it("detects pre-market", () => {
    const session = getUsMarketSession(new Date("2026-06-09T12:00:00.000Z")); // 8:00 AM ET
    expect(session.label).toBe("US Pre-Market");
  });

  it("detects after hours", () => {
    const session = getUsMarketSession(new Date("2026-06-09T21:30:00.000Z")); // 5:30 PM ET
    expect(session.label).toBe("US After Hours");
  });

  it("marks weekends as closed", () => {
    const session = getUsMarketSession(new Date("2026-06-07T15:00:00.000Z")); // Sunday
    expect(session.label).toBe("US Market Closed");
  });
});
