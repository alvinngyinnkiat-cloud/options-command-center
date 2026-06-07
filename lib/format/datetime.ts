import { addMonths, format, parseISO } from "date-fns";

/** Parse YYYY-MM-DD or ISO strings at noon UTC to avoid timezone drift. */
export function parseStableDate(isoDate: string): Date {
  if (isoDate.includes("T")) {
    return parseISO(isoDate);
  }
  return parseISO(`${isoDate}T12:00:00`);
}

export function formatDisplayDate(isoDate: string): string {
  return format(parseStableDate(isoDate), "d MMM yyyy");
}

export function formatDisplayDateTime(isoDate: string): string {
  return format(parseISO(isoDate), "d MMM yyyy, HH:mm");
}

export function formatMonthYearLabel(date: Date): string {
  return format(date, "MMM yy");
}

export function addMonthsFromIso(isoDate: string, months: number): Date {
  return addMonths(parseStableDate(isoDate), months);
}
