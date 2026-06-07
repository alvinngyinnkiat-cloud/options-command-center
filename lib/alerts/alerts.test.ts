import { describe, expect, it } from "vitest";
import { buildAlertsSummary } from "./summary";
import { isAveragePriceNearLevel } from "./proximity";
import { buildScannerAlerts } from "./scanner-alerts";
import type { EnrichedAlert } from "./types";

describe("alert proximity", () => {
  it("detects average price near level", () => {
    expect(isAveragePriceNearLevel(100.5, 100, 1.5)).toBe(true);
    expect(isAveragePriceNearLevel(110, 100, 1.5)).toBe(false);
  });
});

describe("alert summary", () => {
  it("counts active alerts by severity", () => {
    const alerts: EnrichedAlert[] = [
      {
        id: "1",
        key: "a",
        alertType: "scanner",
        ticker: "SPY",
        severity: "info",
        message: "m",
        suggestedAction: "Watch",
        status: "active",
        createdDate: "2026-06-01",
      },
      {
        id: "2",
        key: "b",
        alertType: "risk",
        ticker: null,
        severity: "critical",
        message: "m",
        suggestedAction: "Act",
        status: "dismissed",
        createdDate: "2026-06-01",
      },
    ];
    const summary = buildAlertsSummary(alerts);
    expect(summary.active).toBe(1);
    expect(summary.critical).toBe(0);
    expect(summary.info).toBe(1);
  });
});

describe("scanner alerts", () => {
  it("returns empty for unscored rows", () => {
    expect(buildScannerAlerts([])).toEqual([]);
  });
});
