import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
  startOfYear,
  subDays,
} from "date-fns";
import { formatNumber } from "@/lib/format/currency";
import type {
  AchievementMilestone,
  DailyPortfolioSnapshot,
  GoalProgressMilestone,
  PortfolioHistoryComparison,
  PortfolioHistoryPeriod,
  PortfolioHistoryTableRow,
  PortfolioMilestones,
  PortfolioPerformanceMetrics,
  ThresholdMilestone,
} from "./daily-snapshot-types";
import type { PortfolioHistoryFilterId } from "./history-preferences";
import { getSingaporeSnapshotDate } from "./snapshot-date";

/** Smoke-test and demo rows that must not affect goals or milestones. */
export const EXCLUDED_SNAPSHOT_DATE = "2099-01-15";

export function isRealPortfolioSnapshot(
  snapshot: DailyPortfolioSnapshot
): boolean {
  if (snapshot.snapshotDate === EXCLUDED_SNAPSHOT_DATE) return false;
  if (snapshot.id.startsWith("mock-daily-")) return false;
  if (snapshot.snapshotDate > getSingaporeSnapshotDate()) return false;
  return true;
}

export function filterRealPortfolioSnapshots(
  snapshots: DailyPortfolioSnapshot[]
): DailyPortfolioSnapshot[] {
  return snapshots.filter(isRealPortfolioSnapshot);
}

export function snapshotOnOrBefore(
  snapshots: DailyPortfolioSnapshot[],
  target: Date
): DailyPortfolioSnapshot | null {
  const targetMs = startOfDay(target).getTime();
  const sorted = [...snapshots].sort(
    (a, b) =>
      parseISO(b.snapshotDate).getTime() - parseISO(a.snapshotDate).getTime()
  );
  return (
    sorted.find(
      (s) => startOfDay(parseISO(s.snapshotDate)).getTime() <= targetMs
    ) ?? null
  );
}

/** Prefer today's snapshot; otherwise the newest snapshot on or before asOfDate. */
export function selectLatestSnapshot(
  snapshots: DailyPortfolioSnapshot[],
  asOfDate: string
): DailyPortfolioSnapshot | null {
  if (snapshots.length === 0) return null;

  const asOfMs = startOfDay(parseISO(asOfDate)).getTime();
  const onOrBefore = snapshots.filter(
    (s) => startOfDay(parseISO(s.snapshotDate)).getTime() <= asOfMs
  );
  if (onOrBefore.length === 0) return null;

  const todayMatch = onOrBefore.find((s) => s.snapshotDate === asOfDate);
  if (todayMatch) return todayMatch;

  return onOrBefore.reduce((latest, snap) =>
    parseISO(snap.snapshotDate).getTime() >
    parseISO(latest.snapshotDate).getTime()
      ? snap
      : latest
  );
}

function changeMetrics(
  current: number | null,
  prior: number | null
): { difference: number | null; differencePct: number | null } {
  if (current == null || prior == null || prior === 0) {
    return { difference: null, differencePct: null };
  }
  const difference = current - prior;
  return {
    difference,
    differencePct: (difference / prior) * 100,
  };
}

export function buildHistoryComparisons(
  snapshots: DailyPortfolioSnapshot[],
  asOfDate: string
): PortfolioHistoryComparison[] {
  const today = parseISO(asOfDate);
  const latest =
    snapshotOnOrBefore(snapshots, today) ??
    snapshots[snapshots.length - 1] ??
    null;
  const currentValue = latest?.portfolioValueSgd ?? null;

  const anchors: { label: string; date: Date }[] = [
    { label: "Today", date: today },
    { label: "Yesterday", date: subDays(today, 1) },
    { label: "7 Days Ago", date: subDays(today, 7) },
    { label: "30 Days Ago", date: subDays(today, 30) },
    { label: "90 Days Ago", date: subDays(today, 90) },
    { label: "Year Start", date: startOfYear(today) },
  ];

  return anchors.map(({ label, date }) => {
    const snap = snapshotOnOrBefore(snapshots, date);
    const value = snap?.portfolioValueSgd ?? null;
    const { difference, differencePct } =
      label === "Today" || currentValue == null
        ? { difference: null, differencePct: null }
        : changeMetrics(currentValue, value);

    return {
      label,
      referenceDate: format(date, "yyyy-MM-dd"),
      portfolioValue: value,
      difference,
      differencePct,
    };
  });
}

export function buildPerformanceMetrics(
  snapshots: DailyPortfolioSnapshot[],
  asOfDate: string
): PortfolioPerformanceMetrics {
  const today = parseISO(asOfDate);
  const latest = snapshotOnOrBefore(snapshots, today);
  const current = latest?.portfolioValueSgd ?? null;

  const yesterday = snapshotOnOrBefore(snapshots, subDays(today, 1));
  const weekAgo = snapshotOnOrBefore(snapshots, subDays(today, 7));
  const monthAgo = snapshotOnOrBefore(snapshots, subDays(today, 30));
  const quarterAgo = snapshotOnOrBefore(snapshots, subDays(today, 90));
  const yearStart = snapshotOnOrBefore(snapshots, startOfYear(today));
  const first = [...snapshots].sort(
    (a, b) =>
      parseISO(a.snapshotDate).getTime() - parseISO(b.snapshotDate).getTime()
  )[0];

  const daily = changeMetrics(current, yesterday?.portfolioValueSgd ?? null);
  const weekly = changeMetrics(current, weekAgo?.portfolioValueSgd ?? null);
  const monthly = changeMetrics(current, monthAgo?.portfolioValueSgd ?? null);
  const quarterly = changeMetrics(current, quarterAgo?.portfolioValueSgd ?? null);
  const ytd = changeMetrics(current, yearStart?.portfolioValueSgd ?? null);
  const allTime = changeMetrics(current, first?.portfolioValueSgd ?? null);

  return {
    dailyChange: daily.difference,
    dailyChangePct: daily.differencePct,
    weeklyChange: weekly.difference,
    weeklyChangePct: weekly.differencePct,
    monthlyChange: monthly.difference,
    monthlyChangePct: monthly.differencePct,
    quarterlyChange: quarterly.difference,
    quarterlyChangePct: quarterly.differencePct,
    ytdChange: ytd.difference,
    ytdChangePct: ytd.differencePct,
    allTimeChange: allTime.difference,
    allTimeChangePct: allTime.differencePct,
  };
}

export function buildMilestones(
  snapshots: DailyPortfolioSnapshot[],
  asOfDate: string
): PortfolioMilestones {
  const real = filterRealPortfolioSnapshots(snapshots);
  if (real.length === 0) {
    return { highest: null, lowest: null, current: null, average: null };
  }

  const latest = selectLatestSnapshot(real, asOfDate);
  let highest = real[0];
  let lowest = real[0];
  let sum = 0;

  for (const snap of real) {
    sum += snap.portfolioValueSgd;
    if (snap.portfolioValueSgd > highest.portfolioValueSgd) highest = snap;
    if (snap.portfolioValueSgd < lowest.portfolioValueSgd) lowest = snap;
  }

  const current = latest?.portfolioValueSgd ?? null;

  return {
    highest: {
      value: highest.portfolioValueSgd,
      date: highest.snapshotDate,
    },
    lowest: {
      value: lowest.portfolioValueSgd,
      date: lowest.snapshotDate,
    },
    current,
    average: sum / real.length,
  };
}

export function filterSnapshotsByPeriod(
  snapshots: DailyPortfolioSnapshot[],
  period: PortfolioHistoryPeriod,
  asOfDate: string
): DailyPortfolioSnapshot[] {
  const end = parseISO(asOfDate);
  let start: Date;

  switch (period) {
    case "7D":
      start = subDays(end, 7);
      break;
    case "30D":
      start = subDays(end, 30);
      break;
    case "90D":
      start = subDays(end, 90);
      break;
    case "YTD":
      start = startOfYear(end);
      break;
    case "1Y":
      start = subDays(end, 365);
      break;
    case "ALL":
    default:
      return [...snapshots].sort(
        (a, b) =>
          parseISO(a.snapshotDate).getTime() -
          parseISO(b.snapshotDate).getTime()
      );
  }

  return snapshots
    .filter((s) => {
      const d = parseISO(s.snapshotDate);
      return d >= startOfDay(start) && d <= end;
    })
    .sort(
      (a, b) =>
        parseISO(a.snapshotDate).getTime() - parseISO(b.snapshotDate).getTime()
    );
}

export function toChartSeries(
  snapshots: DailyPortfolioSnapshot[]
): {
  date: string;
  value: number;
  pnl: number;
  returnPct: number;
  recordedAt: string;
}[] {
  return snapshots.map((s) => ({
    date: s.snapshotDate,
    value: s.portfolioValueSgd,
    pnl: s.myPortfolioPnlSgd,
    returnPct: s.myReturnPct,
    recordedAt: s.updatedAt ?? s.createdAt,
  }));
}

/** Generate mock history for demo when no DB rows exist. */
export function generateMockSnapshotHistory(
  currentValue: number,
  asOfDate: string,
  days = 365
): DailyPortfolioSnapshot[] {
  const end = parseISO(asOfDate);
  const rows: DailyPortfolioSnapshot[] = [];
  const startValue = currentValue * 0.82;

  for (let i = days; i >= 0; i--) {
    const date = format(subDays(end, i), "yyyy-MM-dd");
    const progress = (days - i) / days;
    const noise = Math.sin(i / 8) * 0.015 + Math.cos(i / 21) * 0.01;
    const value = startValue + (currentValue - startValue) * progress;
    const portfolioValue = Math.round(value * (1 + noise));

    rows.push({
      id: `mock-daily-${date}`,
      snapshotDate: date,
      portfolioValueSgd: portfolioValue,
      stockOptionsValueSgd: portfolioValue * 0.72,
      cryptoValueSgd: portfolioValue * 0.08,
      usdCash: 18_000,
      sgdCash: 12_000,
      usdCashSgdEquivalent: 0,
      tradingCashSgd: 12_000,
      cryptoCashSgd: 2_500,
      tradingCapitalSgd: portfolioValue * 0.72 + 12_000,
      totalCashSgd: 12_000 + 2_500,
      openRisk: 45_000,
      availableRiskCapacity: 142_000,
      personalUnrealizedPnl: 820,
      personalRealizedPnl: 12_400,
      clientPnl: 340,
      clientInitialCapitalSgd: 3_000,
      clientCurrentValueSgd: 3_340,
      totalAssetsManagedSgd: portfolioValue + 3_340,
      totalPortfolioSgd: portfolioValue + 3_340,
      totalContributionsSgd: portfolioValue * 0.85,
      myPortfolioPnlSgd: portfolioValue - portfolioValue * 0.85,
      myReturnPct: ((portfolioValue - portfolioValue * 0.85) / (portfolioValue * 0.85)) * 100,
      portfolioHealthScore: 78,
      notes: null,
      createdAt: `${date}T15:59:00.000Z`,
      updatedAt: `${date}T15:59:00.000Z`,
    });
  }

  return rows;
}

export function daysBetweenSnapshots(a: string, b: string): number {
  return Math.abs(differenceInCalendarDays(parseISO(a), parseISO(b)));
}

export function snapshotForReportRange(
  snapshots: DailyPortfolioSnapshot[],
  startDate: Date,
  endDate: Date
): { start: DailyPortfolioSnapshot | null; end: DailyPortfolioSnapshot | null } {
  return {
    start: snapshotOnOrBefore(snapshots, startDate),
    end: snapshotOnOrBefore(snapshots, endDate),
  };
}

const DEFAULT_THRESHOLD_MILESTONES = [10_000, 25_000, 50_000, 75_000, 100_000];

export const ACHIEVEMENT_MILESTONE_THRESHOLDS = DEFAULT_THRESHOLD_MILESTONES;

export const LONG_TERM_GOAL_THRESHOLDS = [250_000, 500_000, 750_000, 1_000_000];

export function formatSgdMilestoneAmount(thresholdSgd: number): string {
  if (thresholdSgd >= 1_000_000 && thresholdSgd % 1_000_000 === 0) {
    return `${thresholdSgd / 1_000_000}M`;
  }
  if (thresholdSgd >= 1_000 && thresholdSgd % 1_000 === 0) {
    return `${thresholdSgd / 1_000}K`;
  }
  return formatNumber(thresholdSgd, 0);
}

export function formatAchievementMilestoneLabel(thresholdSgd: number): string {
  return `First SGD ${formatSgdMilestoneAmount(thresholdSgd)}`;
}

export function formatGoalMilestoneLabel(thresholdSgd: number): string {
  return `SGD ${formatSgdMilestoneAmount(thresholdSgd)} Goal`;
}

function sortSnapshotsChronologically(
  snapshots: DailyPortfolioSnapshot[]
): DailyPortfolioSnapshot[] {
  return [...snapshots].sort(
    (a, b) =>
      parseISO(a.snapshotDate).getTime() - parseISO(b.snapshotDate).getTime()
  );
}

/**
 * First date My Portfolio Value exceeded threshold.
 * Returns insufficientData when the earliest snapshot is already at/above threshold.
 */
export function findFirstThresholdAchievement(
  snapshots: DailyPortfolioSnapshot[],
  thresholdSgd: number
): { reachedDate: string | null; insufficientData: boolean } {
  const sorted = sortSnapshotsChronologically(snapshots);
  if (sorted.length === 0) {
    return { reachedDate: null, insufficientData: false };
  }

  for (let i = 0; i < sorted.length; i++) {
    const snap = sorted[i];
    if (snap.portfolioValueSgd < thresholdSgd) continue;

    if (i === 0) {
      return { reachedDate: null, insufficientData: true };
    }
    return { reachedDate: snap.snapshotDate, insufficientData: false };
  }

  return { reachedDate: null, insufficientData: false };
}

export function buildAchievementMilestones(
  snapshots: DailyPortfolioSnapshot[],
  thresholds: number[] = ACHIEVEMENT_MILESTONE_THRESHOLDS
): AchievementMilestone[] {
  const real = filterRealPortfolioSnapshots(snapshots);
  const unique = [...new Set(thresholds.filter((t) => t > 0))].sort(
    (a, b) => a - b
  );

  return unique.map((thresholdSgd) => {
    const { reachedDate, insufficientData } = findFirstThresholdAchievement(
      real,
      thresholdSgd
    );
    return {
      label: formatAchievementMilestoneLabel(thresholdSgd),
      thresholdSgd,
      reachedDate,
      insufficientData,
    };
  });
}

export function buildGoalProgressMilestones(
  currentValueSgd: number | null,
  goalThresholds: number[],
  options?: { customIds?: Map<number, string> }
): GoalProgressMilestone[] {
  const current = currentValueSgd ?? 0;
  const unique = [...new Set(goalThresholds.filter((t) => t > 0))].sort(
    (a, b) => a - b
  );

  return unique.map((goalValueSgd) => ({
    id: options?.customIds?.get(goalValueSgd),
    label: formatGoalMilestoneLabel(goalValueSgd),
    goalValueSgd,
    currentValueSgd: current,
    progressPct:
      goalValueSgd > 0 ? (current / goalValueSgd) * 100 : 0,
    remainingSgd: Math.max(0, goalValueSgd - current),
    isCustom: options?.customIds?.has(goalValueSgd),
  }));
}

/** @deprecated Use buildAchievementMilestones for historical milestones. */
export function buildThresholdMilestones(
  snapshots: DailyPortfolioSnapshot[],
  customThresholds: number[] = []
): ThresholdMilestone[] {
  const achievements = buildAchievementMilestones(snapshots, [
    ...ACHIEVEMENT_MILESTONE_THRESHOLDS,
    ...customThresholds.filter(
      (t) => !ACHIEVEMENT_MILESTONE_THRESHOLDS.includes(t) && t > 0
    ),
  ]);

  return achievements.map((m) => ({
    label: m.label,
    thresholdSgd: m.thresholdSgd,
    reachedDate: m.insufficientData ? null : m.reachedDate,
    isCustom: !ACHIEVEMENT_MILESTONE_THRESHOLDS.includes(m.thresholdSgd),
  }));
}

export function filterRowsByHistoryFilter(
  rows: PortfolioHistoryTableRow[],
  filter: PortfolioHistoryFilterId,
  asOfDate: string
): PortfolioHistoryTableRow[] {
  if (filter === "all") return rows;

  const end = parseISO(asOfDate);
  let start: Date;

  switch (filter) {
    case "7d":
      start = subDays(end, 7);
      break;
    case "30d":
      start = subDays(end, 30);
      break;
    case "90d":
      start = subDays(end, 90);
      break;
    case "ytd":
      start = startOfYear(end);
      break;
    case "1y":
      start = subDays(end, 365);
      break;
    default:
      return rows;
  }

  return rows.filter((row) => {
    const d = parseISO(row.snapshotDate);
    return d >= startOfDay(start) && d <= end;
  });
}

export function buildHistoryTableRows(
  snapshots: DailyPortfolioSnapshot[]
): PortfolioHistoryTableRow[] {
  const sorted = [...snapshots].sort(
    (a, b) =>
      parseISO(b.snapshotDate).getTime() - parseISO(a.snapshotDate).getTime()
  );

  return sorted.map((snap) => {
    const date = parseISO(snap.snapshotDate);
    const priorDay = snapshotOnOrBefore(
      snapshots.filter((s) => s.id !== snap.id),
      subDays(date, 1)
    );
    const weekAgo = snapshotOnOrBefore(
      snapshots.filter((s) => s.id !== snap.id),
      subDays(date, 7)
    );
    const monthAgo = snapshotOnOrBefore(
      snapshots.filter((s) => s.id !== snap.id),
      subDays(date, 30)
    );

    const daily = changeMetrics(
      snap.portfolioValueSgd,
      priorDay?.portfolioValueSgd ?? null
    );
    const weekly = changeMetrics(
      snap.portfolioValueSgd,
      weekAgo?.portfolioValueSgd ?? null
    );
    const monthly = changeMetrics(
      snap.portfolioValueSgd,
      monthAgo?.portfolioValueSgd ?? null
    );

    return {
      id: snap.id,
      snapshotDate: snap.snapshotDate,
      portfolioValueSgd: snap.portfolioValueSgd,
      clientCurrentValueSgd: snap.clientCurrentValueSgd,
      totalAssetsManagedSgd: snap.totalAssetsManagedSgd,
      dailyChange: daily.difference,
      dailyChangePct: daily.differencePct,
      weeklyChange: weekly.difference,
      weeklyChangePct: weekly.differencePct,
      monthlyChange: monthly.difference,
      monthlyChangePct: monthly.differencePct,
      notes: snap.notes,
    };
  });
}
