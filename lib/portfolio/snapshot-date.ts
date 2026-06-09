const SINGAPORE_TIME_ZONE = "Asia/Singapore";

/** Singapore calendar date (YYYY-MM-DD) for daily portfolio snapshots. */
export function getSingaporeSnapshotDate(
  referenceDate: Date = new Date()
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SINGAPORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(referenceDate);
}

/** @deprecated Use getSingaporeSnapshotDate */
export const getLocalSnapshotDate = getSingaporeSnapshotDate;
