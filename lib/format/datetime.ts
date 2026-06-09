import { addMonths, parseISO } from "date-fns";
import {
  formatSgtDate,
  formatSgtDateTime,
} from "@/lib/time/singapore-time";

/** Parse YYYY-MM-DD or ISO strings at noon UTC to avoid timezone drift. */
export function parseStableDate(isoDate: string): Date {
  if (isoDate.includes("T")) {
    return parseISO(isoDate);
  }
  return parseISO(`${isoDate}T12:00:00`);
}

/** Calendar date in Singapore context (date-only fields). */
export function formatDisplayDate(isoDate: string): string {
  if (isoDate.includes("T")) {
    return formatSgtDate(isoDate);
  }
  return formatSgtDate(`${isoDate}T12:00:00+08:00`);
}

/** Full timestamp in Singapore Time — 12-hour AM/PM. */
export function formatDisplayDateTime(isoDate: string): string {
  return formatSgtDateTime(isoDate);
}

export function formatMonthYearLabel(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Singapore",
    month: "short",
    year: "2-digit",
  }).formatToParts(date);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  return `${month} ${year}`;
}

export function addMonthsFromIso(isoDate: string, months: number): Date {
  return addMonths(parseStableDate(isoDate), months);
}
