# Watchlist Production Ready Audit

**Audit date:** 2026-06-08  
**Scope:** Scheduled auto-refresh at 06:00 SGT — cron config, pipeline, Data Health, duplicate-risk review.

---

## 1. Schedule confirmation

### `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/watchlist-refresh",
      "schedule": "0 22 * * *"
    }
  ]
}
```

| Check | Result |
|-------|--------|
| Cron expression | **`0 22 * * *`** — confirmed |
| Single cron entry | Yes — only one watchlist job |
| Path | `/api/cron/watchlist-refresh` |

### `lib/watchlist/scheduled-refresh-config.ts`

| Constant | Value |
|----------|--------|
| `WATCHLIST_REFRESH_TIMEZONE` | `Asia/Singapore` |
| `WATCHLIST_REFRESH_CRON_LOCAL` | `0 6 * * *` (production intent) |
| `WATCHLIST_REFRESH_CRON_UTC` | `0 22 * * *` (Vercel deployment) |
| `WATCHLIST_REFRESH_LOCAL_HOUR` | `6` |
| `WATCHLIST_REFRESH_LOCAL_MINUTE` | `0` |

### Timezone math

Singapore is **UTC+8** with **no daylight saving**.

```
22:00 UTC  +  8 hours  =  06:00 SGT (next calendar day in SGT)
```

Example: `2026-06-08T22:00:00Z` → `2026-06-09 06:00 SGT`

**Confirmed:** `0 22 * * *` on Vercel equals **06:00 AM Singapore Time daily**.

---

## 2. Cron entrypoint

### `app/api/cron/watchlist-refresh/route.ts`

| Step | Behavior |
|------|----------|
| Auth | `Authorization: Bearer ${CRON_SECRET}` required |
| Supabase guard | 503 if not configured |
| Market guard | Skips if `isUsMarketClosedForDay(now)` is false |
| User discovery | All `user_id` with `watchlist.is_active = true` |
| Per-user work | `runScheduledWatchlistRefreshForUser(userId, now)` — **once per user** |

At **06:00 SGT**, US market is always closed from the prior session, so the guard passes on every scheduled run.

---

## 3. Audit checklist

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Cron = `0 22 * * *` | **PASS** | `vercel.json` line 5 |
| 22:00 UTC = 06:00 SGT | **PASS** | UTC+8, no DST; config documents mapping |
| Refresh Market Data runs | **PASS** | `syncWatchlistDataForUser` → FMP/Yahoo fetch + `market_data` upsert |
| Refresh Technical Indicators runs | **PASS** | Same sync loop → `computeIndicatorsFromCandles` + `technical_indicators` upsert |
| Refresh Auto Watchlist runs | **PASS** | `refreshAutoWatchlistAsAdmin` after sync |
| Data Health updates Scanner Ready | **PASS** | `getWatchlistScannerHealthStatus` reads DB on page load / health check |
| No duplicate refreshes (cron) | **PASS** | See §5 |

---

## 4. Final execution order

One Vercel cron fire → one HTTP GET → one pass per user.

```
┌─────────────────────────────────────────────────────────────────┐
│  VERCEL CRON  —  0 22 * * * UTC  (= 06:00 SGT daily)           │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  GET /api/cron/watchlist-refresh                                │
│    1. Verify CRON_SECRET                                        │
│    2. Verify Supabase configured                                │
│    3. Guard: isUsMarketClosedForDay(now)                        │
│    4. listActiveWatchlistUserIds()                              │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
              FOR EACH user_id (sequential)
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  runScheduledWatchlistRefreshForUser(userId, now)               │
│                                                                 │
│  STEP A — syncWatchlistDataForUser                              │
│    A1. lastCompletedTradingDate(now) → target candle date       │
│    A2. fetchActiveWatchlist(userId)                             │
│    FOR EACH active ticker (one API call per ticker):            │
│      A3. fetchDailyCandlesForTicker  (FMP → Yahoo fallback)     │
│      A4. Filter candles ≤ completed date (no partial/intraday)  │
│      A5. upsertHistoricalMarketData → market_data               │
│      A6. computeIndicatorsFromCandles                           │
│           (EMA20, SMA50, SMA200, ATR14, Stochastic)             │
│           Average Price = (High + Low) / 2                      │
│      A7. upsertIndicatorRow → technical_indicators              │
│      A8. Optional prior-day indicator row (SMA50 crossover)   │
│                                                                 │
│  STEP B — getWatchlistScannerDataForUser                        │
│    B1. Read market_data, technical_indicators, support_resistance│
│    B2. Build scanner rows (Average Price — not Close)           │
│    B3. attachScoresToRows + persistScannerScores                │
│    (No external OHLCV refetch — DB read + score write only)     │
│                                                                 │
│  STEP C — refreshAutoWatchlistAsAdmin                           │
│    C1. fetchMarketCapUniverse()                                 │
│    C2. buildAutoWatchlistCategories                             │
│    C3. Replace auto_watchlist_results for user                  │
│                                                                 │
│  STEP D — logScheduledRefresh (audit logs only)                 │
│    D1. Insert watchlist_scheduled_refresh                       │
│    D2. Insert market_data mirror log                            │
│    D3. Insert technical_indicators mirror log                     │
│    D4. Insert auto_watchlist log (if Step C succeeded)          │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Return JSON { ok, schedule, usersProcessed, results[] }        │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  DATA HEALTH (on next page load or Run Full Health Check)       │
│    getWatchlistScannerHealthStatus(userId)                      │
│      → Last Automated Refresh (watchlist_scheduled_refresh log) │
│      → Last Completed Candle (lastCompletedTradingDate)        │
│      → Indicators Updated / Auto Watchlist Updated              │
│      → Scanner Ready (green when candles + indicators current)  │
│      → Data Source (FMP / FMP + Yahoo fallback)                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Duplicate refresh analysis

### Within one scheduled run (per user)

| Operation | Times executed | Notes |
|-----------|----------------|-------|
| `syncWatchlistDataForUser` | **1** | Single entry point for OHLCV + indicators |
| `fetchDailyCandlesForTicker` per ticker | **1 per ticker** | Not repeated for indicators |
| `getWatchlistScannerDataForUser` | **1** | Reads DB only; no second FMP/Yahoo pull |
| `refreshAutoWatchlistAsAdmin` | **1** | Separate screener universe (by design) |
| `data_source_logs` inserts | **4 rows** | Audit mirrors only — no re-sync |

**Verdict:** No duplicate market-data or indicator **API fetches** during cron.

### Intentional coupling (not duplication)

- **Market Data + Technical Indicators** share one ticker loop in `syncWatchlistDataForUser`. This matches the manual Data Health buttons, which also call `refreshWatchlistScannerForUser` → same combined sync. Indicators are computed from candles already in memory — not a second provider call.

### Manual vs scheduled (isolated)

| Trigger | Path | Affects 06:00 schedule? |
|---------|------|-------------------------|
| Vercel cron | `runScheduledWatchlistRefreshForUser` | — |
| Refresh Market Data button | `refreshWatchlistScannerForUser` + `market_data` log | No |
| Refresh Technical Indicators button | `refreshWatchlistScannerForUser` + `technical_indicators` log | No |
| Refresh Auto Watchlist button | `refreshAutoWatchlistAction` only | No |

Manual runs write separate logs and do not modify `vercel.json` or the cron schedule.

**Note:** Clicking both **Refresh Market Data** and **Refresh Technical Indicators** manually runs the full sync twice — that is user-triggered, not cron duplication.

### Removed duplicate cron path

The cron route previously called `refreshWatchlistScannerForUserAsAdmin` directly. It now calls `runScheduledWatchlistRefreshForUser`, which adds Auto Watchlist and structured scheduled logging without a second sync call.

---

## 6. Data rules (verified in pipeline)

| Rule | Enforced in |
|------|-------------|
| Completed daily candles only | `lastCompletedTradingDate`, candle filter `c.date <= completedCandleDate` |
| No intraday / partial candles | Provider daily interval; post-close guard; date filter |
| Average Price = (High + Low) / 2 | `compute-indicators.ts`, scanner calculations |
| Scanner uses Average Price | `buildMarketDataFields` / scoring |
| Support/Resistance manual only | Not written during sync or cron |
| FMP first, Yahoo fallback | `fetchDailyCandlesForTicker` |

---

## 7. Production readiness summary

| Area | Status |
|------|--------|
| Schedule (06:00 SGT / 22:00 UTC) | **Ready** |
| Cron auth (`CRON_SECRET`) | **Ready** (env required in production) |
| Full pipeline (market → indicators → scanner → auto watchlist) | **Ready** |
| Data Health Scanner Ready reflection | **Ready** (read-after-write on page load) |
| Duplicate cron / duplicate API fetch | **None found** |
| Manual refresh independence | **Confirmed** |

### Required production env

```
CRON_SECRET
SUPABASE_SERVICE_ROLE_KEY
FMP_API_KEY          (optional — Yahoo fallback if FMP blocked)
NEXT_PUBLIC_SUPABASE_URL
```

---

## 8. Related files

| File | Role |
|------|------|
| `vercel.json` | UTC cron trigger |
| `lib/watchlist/scheduled-refresh-config.ts` | SGT constants + timestamp formatting |
| `app/api/cron/watchlist-refresh/route.ts` | Cron HTTP handler |
| `lib/watchlist/run-scheduled-watchlist-refresh.ts` | Orchestrated per-user pipeline |
| `lib/watchlist/sync-watchlist-data.ts` | Market data + indicators sync |
| `lib/supabase/queries/watchlist-scanner.ts` | Scanner score rebuild (DB-only) |
| `lib/supabase/queries/auto-watchlist.ts` | Auto watchlist admin refresh |
| `lib/watchlist/scanner-status.ts` | Scanner Ready for Data Health |
| `components/data-health/WatchlistScannerHealthCard.tsx` | UI display |

---

**Audit conclusion:** Watchlist auto-refresh is **production ready** for daily 06:00 SGT execution with a single cron, a single sync pass per user, and correct Data Health reflection after completion.
