# Data Health Summary Parity Fix

## Problem

After a successful **Refresh Market Data** run, the Data Health page showed:

- **Last Refresh — Per Ticker**: all active symbols `success` (Yahoo/FMP)
- **Market Data Source Summary**: `Yahoo Success = 4`, `Failed = 8`

The summary did not match the per-ticker refresh results.

## Root Causes

### 1. Summary ignored latest refresh diagnostics

`getFmpHealthDiagnostics()` always counted from `getMarketDataSourceBreakdown()` (database read), even when `lastSyncTickerDiagnostics` from the just-finished sync was passed in. The per-ticker table used diagnostics; the summary did not.

### 2. Legacy failed-ticker merge inflated failures

Failed tickers were merged from:

- DB breakdown `failedSymbols`
- `scannerStatus.staleTickers`
- `scannerStatus.missingIndicatorTickers`

This was FMP-era logic and could probe/re-report symbols that had already succeeded in the latest refresh.

### 3. DB breakdown hit PostgREST row limit

`getMarketDataSourceBreakdown()` loaded **all** `market_data` rows for active watchlist IDs, then picked the max `price_date` per ticker in memory.

With ~260 historical rows per ticker, 12 tickers ≈ 3,120 rows. Supabase/PostgREST default page size is **1000**, so the query returned a truncated slice. Only a subset of tickers had their completed-candle row in that slice — producing false `Failed` counts (e.g. 8 failed, 4 Yahoo).

## Fixes

### `lib/watchlist/market-data-source-breakdown.ts`

1. **`buildMarketDataSourceBreakdownFromDiagnostics()`** — counts FMP/Yahoo/Failed from `TickerSyncDiagnostic[]` (same source as per-ticker table).
2. **`resolveMarketDataSourceBreakdown()`** — prefers diagnostics when present; falls back to DB.
3. **DB query** — primary read uses `price_date = completedTarget` (≤12 rows, no truncation). Missing tickers get a bounded fallback query (`lte price_date`, ordered desc, first row per watchlist).

### `lib/data-health/fmp-status.ts`

1. Summary counts use `resolveMarketDataSourceBreakdown(dbSources, lastSyncTickerDiagnostics)`.
2. `failedTickers` / `failedSymbolCount` use only `sources.failedSymbols` (no stale/missing-indicator merge).
3. `tickersUpdated` counts rows at `completedTarget` instead of scanning all history.

## Expected Behavior

| Scenario | Summary source |
|----------|----------------|
| After **Refresh Market Data** | Latest `tickerDiagnostics` (matches per-ticker table) |
| Page load / **Run Full Health Check** | DB rows at completed candle date (fixed query, no 1000-row cap) |

- **FMP Success** = symbols where latest refresh selected `fmp` (or DB row at target with `source = fmp`).
- **Yahoo Success** = symbols where latest refresh selected `yahoo` (or DB row at target with `source = yahoo`).
- **Failed** = symbols with `status === "failed"` in diagnostics, or no completed-candle OHLCV at target in DB.

## Verification

1. Open **Data Health** → **Refresh Market Data**.
2. Per-ticker table: all symbols `success`.
3. Market Data Source Summary: `Yahoo Success = 12` (or FMP/mixed if applicable), `Failed = 0`.
4. Reload page (no refresh): summary should still align with DB completed-candle rows.

```bash
npm run build
```

## Files Changed

- `lib/watchlist/market-data-source-breakdown.ts`
- `lib/data-health/fmp-status.ts`
- `DATA_HEALTH_SUMMARY_PARITY_FIX.md` (this document)
