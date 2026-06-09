import {
  getEasternParts,
  isNyseTradingDay,
} from "@/lib/market-calendar/nyse-calendar";

export type UsMarketSessionKind =
  | "closed"
  | "pre_market"
  | "regular"
  | "after_hours";

export interface UsMarketSessionInfo {
  session: UsMarketSessionKind;
  label: string;
}

const PRE_MARKET_OPEN = 4 * 60; // 4:00 AM ET
const REGULAR_OPEN = 9 * 60 + 30; // 9:30 AM ET
const REGULAR_CLOSE = 16 * 60; // 4:00 PM ET
const AFTER_HOURS_CLOSE = 20 * 60; // 8:00 PM ET

/** Session status from New York market hours (display times remain SGT-first in UI). */
export function getUsMarketSession(
  now: Date = new Date()
): UsMarketSessionInfo {
  const et = getEasternParts(now);

  if (!isNyseTradingDay(et.dateKey)) {
    return { session: "closed", label: "US Market Closed" };
  }

  const minutes = et.hour * 60 + et.minute;

  if (minutes >= REGULAR_OPEN && minutes < REGULAR_CLOSE) {
    return { session: "regular", label: "US Regular Session" };
  }
  if (minutes >= PRE_MARKET_OPEN && minutes < REGULAR_OPEN) {
    return { session: "pre_market", label: "US Pre-Market" };
  }
  if (minutes >= REGULAR_CLOSE && minutes < AFTER_HOURS_CLOSE) {
    return { session: "after_hours", label: "US After Hours" };
  }

  return { session: "closed", label: "US Market Closed" };
}
