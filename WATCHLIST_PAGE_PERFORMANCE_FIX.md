# Watchlist Page Performance Fix

## Problem

`GET /watchlist` took ~3 minutes in dev because the page render triggered a full market-data sync for all 25 tickers (Yahoo/FMP API calls, indicator recomputation, and score persistence) on every navigation.

## Root cause

`WatchlistScannerDashboard` (previous version) ran on every page load:

1. `ensureDefaultWatchlistItems()` — DB seed/normalize writes
2. `refreshWatchlistScannerForUser()` — **full external sync** (Yahoo/FMP per ticker)
3. `getWatchlistScannerData()` — called **3×** (dashboard, alerts, trade queue)
4. `persistScannerScores()` — **25 sequential Supabase upserts** on every read

## Fix summary

| Before (page load) | After (page load) |
|--------------------|-------------------|
| Yahoo/FMP fetch per ticker | ❌ None |
| Indicator recomputation from API | ❌ None |
| `ensureDefaultWatchlistItems` | ❌ None |
| Score DB upserts | ❌ None |
| Auto Watchlist generation | ❌ None (never on this route) |
| Supabase read: watchlist, market_data, indicators, S/R | ✅ Yes |
| In-memory score attach (25 rows) | ✅ Yes (fast) |

Heavy work now runs only when:

- User clicks **Refresh Data** on `/watchlist`
- User clicks refresh on **Data Health**
- **6:00 AM SGT** scheduled cron (`run-scheduled-watchlist-refresh.ts`)

## Files changed

| File | Change |
|------|--------|
| `components/watchlist/WatchlistScannerDashboard.tsx` | Read-only `getWatchlistPageData()` only |
| `lib/watchlist/get-watchlist-page-data.ts` | **New** — single batched Supabase read path |
| `lib/supabase/queries/watchlist-scanner.ts` | `persistScores: false` by default; optional `intelligenceMap` |
| `app/actions/watchlist.ts` | **New** `refreshWatchlistScannerAction()` for manual refresh |
| `components/watchlist/WatchlistScannerClient.tsx` | **Refresh Data** button (server action) |
| `app/(dashboard)/watchlist/loading.tsx` | **New** skeleton UI |
| `app/(dashboard)/watchlist/page.tsx` | `dynamic = "force-dynamic"` |
| `lib/supabase/queries/alerts-center.ts` | Export `loadPersistedAlertStatuses` for reuse |

## Architecture

```
/watchlist page load (read-only)
  └─ getWatchlistPageData()
       ├─ getAggregatedIntelligenceImpacts()     [Supabase]
       ├─ getWatchlistScannerData({ persistScores: false })
       │    ├─ watchlist, market_data, technical_indicators, support_resistance
       │    └─ attachScoresToRows() in memory only
       ├─ getOptionsTradesData()                 [Supabase]
       ├─ getRiskDashboardData()                 [Supabase]
       ├─ loadPersistedAlertStatuses()           [Supabase]
       └─ getWeekendReviewStatus()               [Supabase]

Manual refresh (button / Data Health / cron)
  └─ refreshWatchlistScannerAction()
       ├─ ensureDefaultWatchlistItems()
       ├─ syncWatchlistDataForUser()             [Yahoo/FMP]
       └─ getWatchlistScannerDataForUser({ persistScores: true })
```

## Verification

1. Restart dev server
2. Open `/watchlist` — should show skeleton briefly, then load in **< 3 seconds**
3. Terminal should **not** show Yahoo/FMP fetch logs on navigation
4. Click **Refresh Data** — full sync runs (may take 1–3 min depending on API)
5. Data Health → Refresh Market Data still works for manual sync

## Expected log (page load)

```
GET /watchlist 200 in <3s
```

No external HTTP to `query1.finance.yahoo.com` or `financialmodelingprep.com` during initial render.
