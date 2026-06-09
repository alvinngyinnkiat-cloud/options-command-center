# Watchlist Refresh Pipeline Parity Fix

## Problem

`/api/test-market-data` succeeded (QQQ/GLD/XSP via Yahoo), but Data Health showed:

```
FMP Success = 0
Yahoo Success = 0
Failed = 12
```

Refresh Market Data appeared not to use the same fallback path as the test endpoint.

---

## Root causes

### 1. Divergent fetch implementations

| Path | Before fix |
|------|------------|
| `/api/test-market-data` | `probeMarketDataForTicker` — separate FMP + Yahoo probes, **30-day** lookback |
| Refresh Market Data | `fetchDailyCandlesForTicker` — unified fallback, **400-day** lookback |
| Cron | Same as refresh via `syncWatchlistDataForUser` |

The test endpoint did **not** call `fetchDailyCandlesForTicker`, so parity was not guaranteed.

### 2. Supabase client mismatch on manual refresh

`refreshWatchlistScannerForUser` called `syncWatchlistDataForUser(userId)` **without** injecting the server Supabase client. In dev mode, sync could fall back to an unauthenticated client while reads used service-role — writes failed silently under RLS.

### 3. Optional DB columns blocking upsert

Sync wrote `average_price` and `fetched_at`. If migration `20260608210000_market_data_average_price_fetched_at.sql` was not applied, **every upsert failed** even when Yahoo fetch succeeded.

---

## Fixes applied

### Single fetch function (canonical)

All paths now use:

```
fetchDailyCandlesForTicker(ticker, from, to)
  → FMP first
  → recoverable failure → Yahoo fallback
  → MarketDataFetchError if both fail
```

Shared lookback via `getWatchlistHistoryRange()` (**400 days** — required for SMA200).

| Consumer | Function |
|----------|----------|
| Refresh Market Data | `syncWatchlistDataForUser` → `fetchDailyCandlesForTicker` |
| Cron 06:00 SGT | `runScheduledWatchlistRefreshForUser` → same sync |
| `/api/test-market-data` | `probeMarketDataForTicker` → **calls `fetchDailyCandlesForTicker`** for selected source |
| `/api/test-fmp` | Legacy FMP diagnostics (unchanged) |

### Manual refresh client injection

```typescript
refreshWatchlistScannerForUser()
  → resolveSupabaseServerAccess()
  → getServerSupabaseClient(access)
  → syncWatchlistDataForUser(access.userId, now, supabase)
  → getWatchlistScannerDataForUser(access.userId, supabase)
```

Same client for **write + read** (matches cron admin path pattern).

### Resilient upsert

If `average_price` / `fetched_at` columns are missing, sync retries upsert with core OHLCV fields only.

### Per-ticker diagnostics

After Refresh Market Data, Data Health shows:

| Symbol | Selected Source | Status |
|--------|-----------------|--------|
| QQQ | yahoo | success |
| NVDA | fmp | success |
| GLD | yahoo | success |

Stored in `sync.tickerDiagnostics` → passed to Data Health page.

### Market Data Source Summary

Counts from **saved `market_data` rows** (latest candle ≥ completed target):

- FMP Success
- Yahoo Success
- Failed

---

## Execution flow (after fix)

```
Refresh Market Data button
    ↓
refreshMarketDataHealth()
    ↓
refreshWatchlistScannerForUser()
    ↓ resolveSupabaseServerAccess + injected client
syncWatchlistDataForUser()
    FOR EACH active ticker:
      fetchDailyCandlesForTicker()   ← same as test endpoint selection
        FMP → fail (402/403/429/premium/no data)
        Yahoo → success
      upsert market_data (source=fmp|yahoo)
      compute + upsert technical_indicators
      push tickerDiagnostics
    ↓
getMarketDataSourceBreakdown()   ← reads saved candles
    ↓
Data Health UI updated
```

---

## Verification

1. Apply migration (if not yet run):
   ```bash
   supabase db push
   ```
   Or run `supabase/migrations/20260608210000_market_data_average_price_fetched_at.sql`

2. **Refresh Market Data** on Data Health

3. Confirm **Last Refresh — Per Ticker** table:
   - QQQ → yahoo → success
   - NVDA → fmp → success

4. Confirm **Market Data Source Summary**:
   - FMP Success > 0
   - Yahoo Success > 0
   - Failed = 0 (if all tickers OK)

5. Compare with **`GET /api/test-market-data`** — selected sources should match

6. **`npm run build`** — must pass

---

## Files changed

| File | Change |
|------|--------|
| `lib/watchlist/market-data-sync-range.ts` | Shared 400-day history range |
| `lib/watchlist/market-data-probe.ts` | Uses `fetchDailyCandlesForTicker` |
| `lib/watchlist/refresh-watchlist-scanner.ts` | Injects Supabase client |
| `lib/watchlist/sync-watchlist-data.ts` | Diagnostics + resilient upsert |
| `app/actions/data-health.ts` | Passes sync diagnostics to UI |
| `lib/data-health/fmp-status.ts` | Last sync ticker table |
| `components/data-health/FmpHealthCard.tsx` | Per-ticker diagnostics UI |

---

**Status:** Pipeline parity restored — Refresh, cron, and test endpoint share `fetchDailyCandlesForTicker`.
