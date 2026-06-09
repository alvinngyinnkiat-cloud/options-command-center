/** Platform default timezone — Singapore Time (UTC+8, no DST). */
export const PLATFORM_TIMEZONE = "Asia/Singapore";
export const MARKET_TIMEZONE = "America/New_York";
export const PLATFORM_TIME_LABEL = "SGT";
export const MARKET_TIME_LABEL = "ET";

export const DAILY_AUTO_REFRESH_LABEL = "6:00 AM SGT";

interface TimezoneParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function monthShort(month: number): string {
  return (
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
      month - 1
    ] ?? "—"
  );
}

function parseIsoDate(iso: string | Date): Date {
  return iso instanceof Date ? iso : new Date(iso);
}

function getTimezoneParts(date: Date, timeZone: string): TimezoneParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function format12hTime(
  hour: number,
  minute: number,
  second?: number
): string {
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const base = `${hour12}:${pad2(minute)}`;
  if (second == null) return `${base} ${period}`;
  return `${base}:${pad2(second)} ${period}`;
}

function formatSgtDateFromParts(parts: Pick<TimezoneParts, "year" | "month" | "day">): string {
  return `${monthShort(parts.month)} ${pad2(parts.day)}, ${parts.year}`;
}

/** Jun 09, 2026 */
export function formatSgtDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const parts = getTimezoneParts(parseIsoDate(iso), PLATFORM_TIMEZONE);
  return formatSgtDateFromParts(parts);
}

/** Jun 09, 2026 1:02:07 PM SGT (audit / log tables). */
export function formatSgtAuditTimestamp(
  iso: string | null | undefined
): string {
  if (!iso) return "—";
  const parts = getTimezoneParts(parseIsoDate(iso), PLATFORM_TIMEZONE);
  const time = format12hTime(parts.hour, parts.minute, parts.second);
  return `${formatSgtDateFromParts(parts)} ${time} ${PLATFORM_TIME_LABEL}`;
}

/** Jun 09, 2026 10:09 AM SGT (general display, no seconds). */
export function formatSgtDateTime(
  iso: string | null | undefined,
  options?: { includeSeconds?: boolean }
): string {
  if (!iso) return "—";
  const parts = getTimezoneParts(parseIsoDate(iso), PLATFORM_TIMEZONE);
  const time = format12hTime(
    parts.hour,
    parts.minute,
    options?.includeSeconds ? parts.second : undefined
  );
  return `${formatSgtDateFromParts(parts)} ${time} ${PLATFORM_TIME_LABEL}`;
}

/** 1:35 PM */
export function formatSgtTime12h(date: Date): string {
  const parts = getTimezoneParts(date, PLATFORM_TIMEZONE);
  return format12hTime(parts.hour, parts.minute);
}

/** 1:35 AM */
export function formatEtTime12h(date: Date): string {
  const parts = getTimezoneParts(date, MARKET_TIMEZONE);
  return format12hTime(parts.hour, parts.minute);
}

/** 1:35 PM SGT | 1:35 AM ET */
export function formatSgtWithEtReference(date: Date): string {
  return `${formatSgtTime12h(date)} ${PLATFORM_TIME_LABEL} | ${formatEtTime12h(date)} ${MARKET_TIME_LABEL}`;
}

export interface SgtHeaderClockDisplay {
  dateLine: string;
  timeLine: string;
  dualTimeLine: string;
}

/** Header clock: date + SGT time + dual SGT|ET reference. */
export function formatSgtHeaderClock(date: Date): SgtHeaderClockDisplay {
  const sgt = getTimezoneParts(date, PLATFORM_TIMEZONE);
  return {
    dateLine: formatSgtDateFromParts(sgt),
    timeLine: `${formatSgtTime12h(date)} ${PLATFORM_TIME_LABEL}`,
    dualTimeLine: formatSgtWithEtReference(date),
  };
}

/** Next daily watchlist refresh at 06:00 SGT. */
export function getNextScheduledRefreshAt(now: Date = new Date()): Date {
  const sgt = getTimezoneParts(now, PLATFORM_TIMEZONE);
  const todayAtSix = new Date(
    `${sgt.year}-${pad2(sgt.month)}-${pad2(sgt.day)}T06:00:00+08:00`
  );
  if (now.getTime() < todayAtSix.getTime()) return todayAtSix;
  return new Date(todayAtSix.getTime() + 24 * 60 * 60 * 1000);
}

export interface NextScheduledRefreshDisplay {
  dateLine: string;
  timeLine: string;
  combined: string;
}

/** Next Refresh: Jun 10, 2026 / 6:00 AM SGT */
export function formatNextScheduledRefresh(
  now: Date = new Date()
): NextScheduledRefreshDisplay {
  const next = getNextScheduledRefreshAt(now);
  const parts = getTimezoneParts(next, PLATFORM_TIMEZONE);
  const dateLine = formatSgtDateFromParts(parts);
  const timeLine = DAILY_AUTO_REFRESH_LABEL;
  return {
    dateLine,
    timeLine,
    combined: `${dateLine} ${timeLine}`,
  };
}

/** Backward-compatible alias used by watchlist scanner status. */
export function formatSingaporeTimestamp(iso: string | null): string | null {
  if (!iso) return null;
  return formatSgtDateTime(iso);
}
