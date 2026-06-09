import { describe, expect, it } from "vitest";
import type { DailyPortfolioSnapshot } from "@/lib/portfolio/daily-snapshot-types";
import {
  buildAchievementMilestones,
  buildGoalProgressMilestones,
  buildHistoryComparisons,
  buildPerformanceMetrics,
  EXCLUDED_SNAPSHOT_DATE,
  filterRealPortfolioSnapshots,
  filterSnapshotsByPeriod,
  findFirstThresholdAchievement,
  isRealPortfolioSnapshot,
  selectLatestSnapshot,
} from "@/lib/portfolio/snapshot-history";

function snap(date: string, value: number): DailyPortfolioSnapshot {
  return {
    id: date,
    snapshotDate: date,
    portfolioValueSgd: value,
    stockOptionsValueSgd: value * 0.8,
    cryptoValueSgd: value * 0.1,
    usdCash: 1000,
    sgdCash: 500,
    usdCashSgdEquivalent: 1850,
    tradingCashSgd: 2350,
    cryptoCashSgd: 0,
    tradingCapitalSgd: value * 0.8 + 2350,
    totalCashSgd: 2350,
    openRisk: 10000,
    availableRiskCapacity: 50000,
    personalUnrealizedPnl: 100,
    personalRealizedPnl: 200,
    clientPnl: 50,
    clientInitialCapitalSgd: 3000,
    clientCurrentValueSgd: 3340,
    totalAssetsManagedSgd: value + 3340,
    portfolioHealthScore: 80,
    notes: null,
    createdAt: `${date}T00:00:00.000Z`,
  };
}

describe("snapshot history", () => {
  const snapshots = [
    snap("2026-06-01", 360_000),
    snap("2026-06-05", 370_000),
    snap("2026-06-06", 384_120),
  ];

  it("builds period comparisons", () => {
    const comparisons = buildHistoryComparisons(snapshots, "2026-06-06");
    const today = comparisons.find((c) => c.label === "Today");
    expect(today?.portfolioValue).toBe(384_120);
  });

  it("calculates daily change", () => {
    const perf = buildPerformanceMetrics(snapshots, "2026-06-06");
    expect(perf.dailyChange).toBe(14_120);
    expect(perf.dailyChangePct).toBeCloseTo(3.82, 1);
  });

  it("filters chart periods", () => {
    const filtered = filterSnapshotsByPeriod(snapshots, "7D", "2026-06-06");
    expect(filtered.length).toBe(3);
  });

  it("finds first achievement date when history starts below threshold", () => {
    const history = [
      snap("2026-01-01", 8_000),
      snap("2026-02-01", 12_000),
      snap("2026-03-01", 30_000),
    ];
    expect(findFirstThresholdAchievement(history, 10_000)).toEqual({
      reachedDate: "2026-02-01",
      insufficientData: false,
    });
    expect(findFirstThresholdAchievement(history, 25_000)).toEqual({
      reachedDate: "2026-03-01",
      insufficientData: false,
    });
  });

  it("marks insufficient data when earliest snapshot already exceeds threshold", () => {
    const history = [
      snap("2026-01-01", 360_000),
      snap("2026-02-01", 370_000),
    ];
    const result = findFirstThresholdAchievement(history, 10_000);
    expect(result.reachedDate).toBeNull();
    expect(result.insufficientData).toBe(true);
  });

  it("assigns different achievement dates per threshold", () => {
    const history = [
      snap("2026-01-01", 8_000),
      snap("2026-02-01", 12_000),
      snap("2026-03-01", 28_000),
      snap("2026-04-01", 55_000),
      snap("2026-05-01", 80_000),
      snap("2026-06-01", 105_000),
    ];
    const milestones = buildAchievementMilestones(history);
    expect(milestones.find((m) => m.thresholdSgd === 10_000)?.reachedDate).toBe(
      "2026-02-01"
    );
    expect(milestones.find((m) => m.thresholdSgd === 25_000)?.reachedDate).toBe(
      "2026-03-01"
    );
    expect(milestones.find((m) => m.thresholdSgd === 50_000)?.reachedDate).toBe(
      "2026-04-01"
    );
    expect(milestones.find((m) => m.thresholdSgd === 75_000)?.reachedDate).toBe(
      "2026-05-01"
    );
    expect(milestones.find((m) => m.thresholdSgd === 100_000)?.reachedDate).toBe(
      "2026-06-01"
    );
  });

  it("builds goal progress from My Portfolio Value only", () => {
    const goals = buildGoalProgressMilestones(276_486, [500_000]);
    expect(goals[0].currentValueSgd).toBe(276_486);
    expect(goals[0].progressPct).toBeCloseTo(55.2972, 2);
    expect(goals[0].remainingSgd).toBe(223_514);
  });

  it("ignores future smoke-test snapshots when selecting latest", () => {
    const withFuture = [
      ...snapshots,
      snap("2099-01-15", 1_000),
    ];
    const latest = selectLatestSnapshot(withFuture, "2026-06-06");
    expect(latest?.snapshotDate).toBe("2026-06-06");
    expect(latest?.portfolioValueSgd).toBe(384_120);
  });

  it("filters smoke-test and mock snapshot rows", () => {
    const withFake = [
      ...snapshots,
      snap(EXCLUDED_SNAPSHOT_DATE, 1_000),
      { ...snap("2026-06-07", 390_000), id: "mock-daily-2026-06-07" },
    ];
    const real = filterRealPortfolioSnapshots(withFake);
    expect(real).toHaveLength(3);
    expect(real.every(isRealPortfolioSnapshot)).toBe(true);
    expect(
      real.find((s) => s.snapshotDate === EXCLUDED_SNAPSHOT_DATE)
    ).toBeUndefined();
  });
});
