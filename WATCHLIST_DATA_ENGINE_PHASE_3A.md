# Watchlist Data Engine — Phase 3A

**Status:** Complete  
**Date:** 2026-06-08  
**Goal:** Make Watchlist Scanner usable for real trade selection using completed daily candles only.

---

## Summary

Phase 3A implements a full market-data pipeline for the Watchlist Scanner:

1. **Completed daily candle rule** — never live price, never intraday; always the latest fully completed NYSE session.
2. **FMP OHLCV fetch** — daily candles stored in `market_data`.
3. **Average Price** — `(High + Low) / 2` remains the primary scanner reference (not Close).
4. **Computed indicators** — EMA20, SMA50, SMA200, ATR14, Stochastic from stored candles (no mock fallback in Supabase path).
5. **Scanner scoring** — uses Average Price, all indicators, daily + weekly manual S/R (excludes DTE, Premium, Delta, Volume).
6. **Post-close refresh** — cron route + Data Health manual refresh actions.
7. **Data Health card** — Scanner Ready status with green/red indicator.

---

## Part 1 — Completed Daily Candle Rule

**File:** `lib/market-calendar/nyse-calendar.ts`

| Function | Purpose |
|----------|---------|
| `lastCompletedTradingDate(now)` | Returns latest fully completed NYSE session (YYYY-MM-DD) |
| `isUsMarketClosedForDay(now)` | True after 16:00 ET on trading days |
| `selectCompletedCandleDate(dates, now)` | Picks target candle from available DB dates |
| `isNyseTradingDay(dateKey)` | Weekday + holiday check |

**Example (2026-06-09):**
- Before 16:00 ET → use **2026-06-08** candle
- After 16:00 ET → use **2026-06-09** candle

**Tests:** `lib/market-calendar/nyse-calendar.test.ts`

---

## Part 2 — Market Data Fetch

**Files:**
- `lib/watchlist/market-data-provider.ts` — FMP `stable/historical-price-eod/full`
- `lib/watchlist/sync-watchlist-data.ts` — orchestrator

**Requires:** `FMP_API_KEY` in server environment

**Flow:**
```
Active watchlist tickers
  → FMP daily OHLCV (400 days history)
  → Filter to completed candle date
  → Upsert market_data (watchlist_id, price_date)
```

**Stored fields:** `open`, `high`, `low`, `close`, `volume`, `source`, `price_date`

---

## Part 3 — Average Price

**Unchanged logic** in `lib/watchlist/average-price.ts` and `lib/watchlist/calculations.ts`:

```
Average Price = (High + Low) / 2
```

Scanner scoring and recommendations use Average Price. `currentPrice` displays completed candle Close (not a live feed).

---

## Part 4 — Indicators

**File:** `lib/watchlist/compute-indicators.ts`

| Indicator | Method |
|-----------|--------|
| EMA20 | Exponential moving average |
| SMA50 | Simple moving average |
| SMA200 | Simple moving average (requires 200+ candles) |
| ATR14 | Average True Range |
| Stochastic | 14-period %K |

**Storage:** `technical_indicators` table, keyed by `(watchlist_id, indicator_date)`

**Supabase path:** `watchlist-scanner.ts` no longer falls back to mock indicators when DB rows are missing — missing data surfaces as zeros and Data Health flags stale state.

**Tests:** `lib/watchlist/compute-indicators.test.ts`

---

## Part 5 — Scanner Score

**Scoring inputs (100 points):**

| Component | Weight | Source |
|-----------|--------|--------|
| Trend (SMA50/SMA200) | 35 | Computed indicators |
| Stochastic | 25 | Computed indicators |
| EMA20 distance | 20 | Average Price vs EMA20 |
| Support/Resistance | 20 | Daily + Weekly manual levels |

**Weekly S/R:** When weekly manual levels exist, daily and weekly S/R scores are averaged within the 20-point bucket.

**Excluded:** DTE, Premium, Delta, Volume

**Files:**
- `lib/watchlist/scoring/compute.ts`
- `lib/watchlist/scoring/support-resistance.ts` (weekly support added)
- `lib/supabase/queries/watchlist-scanner.ts` (loads daily + weekly S/R)

---

## Part 6 — Automatic Refresh

**Manual refresh (Data Health page):**
- "Refresh Market Data" → `syncWatchlistDataForUser` → FMP fetch + indicator compute + score persist
- "Refresh Technical Indicators" → same pipeline (indicators recomputed from candles)

**Scheduled cron:**
- **Route:** `GET /api/cron/watchlist-refresh`
- **Auth:** `Authorization: Bearer $CRON_SECRET`
- **Guard:** Skips if US market not yet closed (`isUsMarketClosedForDay`)
- **Schedule:** `vercel.json` — `30 21 * * 1-5` (21:30 UTC ≈ 16:30 ET, weekdays)
- **Multi-user:** Iterates all users with active watchlist items via service role

**Workflow:**
```
Fetch candles → Compute indicators → Update scanner scores → Log data_source_logs
```

---

## Part 7 — Validation (Data Health)

**File:** `lib/watchlist/scanner-status.ts`  
**UI:** `components/data-health/WatchlistScannerHealthCard.tsx`

| Field | Description |
|-------|-------------|
| Last Candle Date | Latest `market_data.price_date` across watchlist |
| Last Refresh Time | Last successful `market_data` log entry |
| Indicators Updated | All active tickers have indicators for completed date |
| Scanner Ready | Green when candle date = target AND indicators current |

**Green:** Ready  
**Red:** Stale Data (with stale/missing ticker list)

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `FMP_API_KEY` | Yes (live data) | Daily OHLCV fetch |
| `CRON_SECRET` | Yes (cron) | Protects `/api/cron/watchlist-refresh` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (cron) | Multi-user refresh without session |

---

## Files Created / Modified

### Created
- `lib/market-calendar/nyse-calendar.ts`
- `lib/market-calendar/nyse-calendar.test.ts`
- `lib/watchlist/market-data-provider.ts`
- `lib/watchlist/compute-indicators.ts`
- `lib/watchlist/compute-indicators.test.ts`
- `lib/watchlist/sync-watchlist-data.ts`
- `lib/watchlist/refresh-watchlist-scanner.ts`
- `lib/watchlist/scanner-status.ts`
- `app/api/cron/watchlist-refresh/route.ts`
- `components/data-health/WatchlistScannerHealthCard.tsx`
- `vercel.json`

### Modified
- `lib/supabase/queries/watchlist-scanner.ts` — completed candle selection, weekly S/R, no mock indicators
- `lib/watchlist/types.ts` — `weeklySupportResistance`
- `lib/watchlist/scoring/types.ts` — weekly S/R in scoring input
- `lib/watchlist/scoring/support-resistance.ts` — daily + weekly scoring
- `lib/watchlist/scoring/compute.ts` — pass weekly levels
- `lib/watchlist/scoring/map-row.ts` — pass weekly levels from row
- `lib/watchlist/calculations.ts` — weekly S/R on enriched row
- `lib/data-health/audit-sources.ts` — updated market/indicator audit messaging
- `lib/data-health/types.ts` — `scannerStatus` on page data
- `lib/data-health/run-health-check.ts` — loads scanner status
- `app/actions/data-health.ts` — wired to sync pipeline
- `components/data-health/DataHealthClient.tsx` — Scanner Ready card

---

## Verification

```bash
npm test -- --run lib/watchlist/compute-indicators.test.ts lib/market-calendar/nyse-calendar.test.ts
npm run build
```

**Build:** Passed (2026-06-08)

---

## Manual Test Checklist

1. Set `FMP_API_KEY` in `.env.local`
2. Open **Data Health** → click **Refresh Market Data**
3. Confirm **Watchlist Scanner** card shows:
   - Last Candle Date = previous trading session
   - Indicators Updated = Yes
   - Scanner Ready = Green
4. Open **Watchlist Scanner** → verify Average Price, EMA20, SMA50, SMA200, ATR14, Stochastic populated
5. Confirm scores use daily + weekly S/R when weekly levels are set manually

---

## Stop

Phase 3A implementation complete. Awaiting next instruction.
