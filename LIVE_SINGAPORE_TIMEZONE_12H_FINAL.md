# Live Singapore Timezone (12-Hour Final)

## Overview

The platform uses **Singapore Time (SGT, `Asia/Singapore`, UTC+8)** as the primary display timezone. US Eastern Time (ET) appears only as a secondary market reference in the dashboard header.

Internal storage remains ISO 8601 UTC in Supabase. All user-facing timestamps are converted at display time.

---

## Time Conversion Utilities

**Module:** `lib/time/singapore-time.ts`

| Function | Output example | Use |
|----------|----------------|-----|
| `formatSgtAuditTimestamp(iso)` | `Jun 09, 2026 1:02:07 PM SGT` | Audit tables, data health logs, refresh history |
| `formatSgtDateTime(iso)` | `Jun 09, 2026 10:09 AM SGT` | General timestamps (auto watchlist, cards) |
| `formatSgtDate(iso)` | `Jun 09, 2026` | Date-only fields |
| `formatSgtTime12h(date)` | `1:35 PM` | Live clock time line |
| `formatEtTime12h(date)` | `1:35 AM` | ET secondary reference |
| `formatSgtWithEtReference(date)` | `1:35 PM SGT \| 1:35 AM ET` | Header dual-time line |
| `formatSgtHeaderClock(date)` | `{ dateLine, timeLine, dualTimeLine }` | Dashboard header |
| `formatSingaporeTimestamp(iso)` | Alias of `formatSgtDateTime` | Watchlist scanner status (backward compatible) |
| `getNextScheduledRefreshAt(now)` | `Date` | Next 06:00 SGT run |
| `formatNextScheduledRefresh(now)` | `{ dateLine, timeLine, combined }` | Data Health scheduled refresh display |
| `DAILY_AUTO_REFRESH_LABEL` | `6:00 AM SGT` | Schedule label everywhere |

**Module:** `lib/format/datetime.ts`

- `formatDisplayDate` / `formatDisplayDateTime` delegate to SGT formatters for all dashboard pages.

---

## Header Clock Logic

**Component:** `components/layout/LiveMarketClock.tsx`

- Client component with `setInterval(..., 1000)` — updates every second.
- Displays:
  - US market session badge (from ET hours)
  - `Jun 09, 2026`
  - `1:35 PM SGT`
  - `1:35 PM SGT | 1:35 AM ET` (secondary ET reference)

**Mounted in:** `components/layout/Header.tsx` (replaces static mock `10:42 AM ET`).

---

## ET Market Session Logic

**Module:** `lib/time/us-market-session.ts`

Session is determined from **New York market hours** (`America/New_York`):

| Session | ET hours (trading days) | Label |
|---------|---------------------------|-------|
| Pre-market | 4:00 AM – 9:30 AM | US Pre-Market |
| Regular | 9:30 AM – 4:00 PM | US Regular Session |
| After hours | 4:00 PM – 8:00 PM | US After Hours |
| Closed | Other times, weekends, NYSE holidays | US Market Closed |

Uses `isNyseTradingDay` from `lib/market-calendar/nyse-calendar.ts` for holiday/weekend detection.

---

## Scheduler Display Logic

**Config:** `lib/watchlist/scheduled-refresh-config.ts`

- Local intent: **6:00 AM SGT** daily (`WATCHLIST_REFRESH_CRON_LOCAL = "0 6 * * *"`)
- Vercel cron (UTC): `0 22 * * *` (previous UTC calendar day)

**Data Health card** (`WatchlistScannerHealthCard.tsx`):

```
12 Active Tickers
Scheduled Daily Refresh: 6:00 AM SGT
Completed Daily Candles Only
```

Also shows:

- **Daily Auto Refresh:** `6:00 AM SGT`
- **Next Refresh:** `Jun 10, 2026` / `6:00 AM SGT`

**Scanner status** (`lib/watchlist/scanner-status.ts`) exposes `scheduledRefreshLabel`, `nextScheduledRefresh`, and `nextScheduledRefreshDate`.

---

## Audit Log Formatting

All data health and refresh logs use **`formatSgtAuditTimestamp`**:

| Location | Before | After |
|----------|--------|-------|
| Data Source Log table | `2026-06-09 05:02:07` (UTC implied) | `Jun 09, 2026 1:02:07 PM SGT` |
| Last checked footer | `… UTC` | `Jun 09, 2026 … SGT` |
| Last Manual Refresh | Raw ISO slice | SGT audit format |
| Last Successful Refresh (FMP card) | Raw ISO slice | SGT audit format |
| Data source health cards | Raw ISO slice | SGT audit format |
| Auto Watchlist generated | `d MMM yyyy, HH:mm` (local) | `Jun 08, 2026 10:09 AM SGT` |

---

## Consistency Rules

**Do not display:**

- `UTC` suffixes
- Raw ISO timestamps (`2026-06-09T05:02:07.000Z`)
- Server/local browser timezone

**Always display:**

- SGT with 12-hour AM/PM
- ET only as secondary market reference in the header

---

## Files Changed

- `lib/time/singapore-time.ts` — core SGT formatters
- `lib/time/us-market-session.ts` — NYSE session labels
- `lib/format/datetime.ts` — SGT delegation
- `lib/watchlist/scheduled-refresh-config.ts` — re-exports + schedule helpers
- `lib/watchlist/scanner-status.ts` — schedule labels + next refresh
- `lib/data-health/audit-sources.ts` — auto watchlist generated timestamp
- `components/layout/LiveMarketClock.tsx` — live header clock
- `components/layout/Header.tsx` — mounts live clock
- `components/data-health/*` — all timestamp displays
- `components/auto-watchlist/AutoWatchlistClient.tsx` — generated timestamp

---

## Tests

```bash
npx vitest run lib/time/singapore-time.test.ts lib/time/us-market-session.test.ts lib/watchlist/scheduled-refresh-config.test.ts
npm run build
```

---

## Expected Result

- Entire platform uses Singapore Time (SGT)
- 12-hour AM/PM format everywhere
- ET only shown as secondary market reference in header
- Watchlist Scanner: `Scheduled Daily Refresh: 6:00 AM SGT`
- Header clock updates live every second
- Audit logs and refresh history fully localized to Singapore time
