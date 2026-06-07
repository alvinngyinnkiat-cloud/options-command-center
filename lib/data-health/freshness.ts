import { differenceInCalendarDays, parseISO, startOfWeek, subDays } from "date-fns";

/** Stale if the date is more than `maxCalendarDays` before reference. */
export function isStaleCalendarDays(
  dateStr: string | null | undefined,
  referenceDate: string,
  maxCalendarDays: number
): boolean {
  if (!dateStr) return true;
  return (
    differenceInCalendarDays(parseISO(referenceDate), parseISO(dateStr)) >
    maxCalendarDays
  );
}

/** Support/resistance should be reviewed each weekend. */
export function needsWeekendReview(
  updateDate: string | null | undefined,
  referenceDate: string
): boolean {
  if (!updateDate) return true;
  const ref = parseISO(referenceDate);
  const weekStart = startOfWeek(ref, { weekStartsOn: 6 });
  return parseISO(updateDate) < weekStart;
}

export function formatRelativeAge(
  dateStr: string | null,
  referenceDate: string
): string {
  if (!dateStr) return "Never";
  const days = differenceInCalendarDays(parseISO(referenceDate), parseISO(dateStr));
  if (days === 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  return `Updated ${days} days ago`;
}
