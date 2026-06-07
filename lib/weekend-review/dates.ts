import { addDays, format, nextSaturday, previousFriday, startOfDay } from "date-fns";

const DATE_FMT = "yyyy-MM-dd";

/** Friday ending the trading week under review (prior Friday on Sat/Sun). */
export function getWeekEndingForReview(reference = new Date()): string {
  const day = startOfDay(reference);
  const dayOfWeek = day.getDay();

  if (dayOfWeek === 6 || dayOfWeek === 0) {
    return format(previousFriday(day), DATE_FMT);
  }

  return format(previousFriday(day), DATE_FMT);
}

/** Calendar date when the review is performed (today). */
export function getReviewDate(reference = new Date()): string {
  return format(startOfDay(reference), DATE_FMT);
}

/** Next Saturday after a given review date — weekly cadence. */
export function getNextReviewDueDate(
  lastReviewDate: string | null,
  reference = new Date()
): string {
  if (!lastReviewDate) {
    const today = startOfDay(reference);
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 6) return format(today, DATE_FMT);
    return format(nextSaturday(today), DATE_FMT);
  }

  const last = startOfDay(new Date(`${lastReviewDate}T12:00:00`));
  let due = addDays(last, 6);
  if (due.getDay() !== 6) {
    due = nextSaturday(due);
  }
  return format(due, DATE_FMT);
}

export function isReviewDue(
  lastReviewDate: string | null,
  nextReviewDueDate: string,
  reference = new Date()
): boolean {
  if (!lastReviewDate) return true;
  const today = format(startOfDay(reference), DATE_FMT);
  return today >= nextReviewDueDate;
}

export function formatReviewDateLabel(isoDate: string): string {
  return format(new Date(`${isoDate}T12:00:00`), "EEE, d MMM yyyy");
}
