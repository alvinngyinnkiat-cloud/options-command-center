/**
 * NYSE session calendar — completed daily candle selection.
 * Uses US/Eastern for market close (16:00 ET).
 */

const NYSE_HOLIDAYS = new Set([
  // 2024
  "2024-01-01",
  "2024-01-15",
  "2024-02-19",
  "2024-03-29",
  "2024-05-27",
  "2024-06-19",
  "2024-07-04",
  "2024-09-02",
  "2024-11-28",
  "2024-12-25",
  // 2025
  "2025-01-01",
  "2025-01-20",
  "2025-02-17",
  "2025-04-18",
  "2025-05-26",
  "2025-06-19",
  "2025-07-04",
  "2025-09-01",
  "2025-11-27",
  "2025-12-25",
  // 2026
  "2026-01-01",
  "2026-01-19",
  "2026-02-16",
  "2026-04-03",
  "2026-05-25",
  "2026-06-19",
  "2026-07-03",
  "2026-09-07",
  "2026-11-26",
  "2026-12-25",
  // 2027
  "2027-01-01",
  "2027-01-18",
  "2027-02-15",
  "2027-03-26",
  "2027-05-31",
  "2027-06-18",
  "2027-07-05",
  "2027-09-06",
  "2027-11-25",
  "2027-12-24",
]);

const MARKET_CLOSE_HOUR_ET = 16;

export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getEasternParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
  dateKey: string;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const weekday = weekdayMap[get("weekday")] ?? 0;

  return {
    year,
    month,
    day,
    hour,
    minute,
    weekday,
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

export function isNyseTradingDay(dateKey: string): boolean {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  const weekday = utc.getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  if (NYSE_HOLIDAYS.has(dateKey)) return false;
  return true;
}

export function isUsMarketClosedForDay(now: Date = new Date()): boolean {
  const et = getEasternParts(now);
  if (!isNyseTradingDay(et.dateKey)) return true;
  if (et.hour > MARKET_CLOSE_HOUR_ET) return true;
  if (et.hour === MARKET_CLOSE_HOUR_ET && et.minute >= 0) return true;
  return false;
}

/** Latest fully completed NYSE daily session date (YYYY-MM-DD). */
export function lastCompletedTradingDate(now: Date = new Date()): string {
  const et = getEasternParts(now);
  let cursor = new Date(Date.UTC(et.year, et.month - 1, et.day));

  const todayComplete =
    isNyseTradingDay(et.dateKey) && et.hour >= MARKET_CLOSE_HOUR_ET;

  if (!todayComplete) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  for (let i = 0; i < 10; i++) {
    const key = formatDateOnly(cursor);
    if (isNyseTradingDay(key)) return key;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return formatDateOnly(cursor);
}

export function selectCompletedCandleDate(
  availableDates: string[],
  now: Date = new Date()
): string {
  const target = lastCompletedTradingDate(now);
  if (availableDates.includes(target)) return target;

  const eligible = [...availableDates]
    .filter((d) => d <= target)
    .sort((a, b) => b.localeCompare(a));

  return eligible[0] ?? target;
}
