# Watchlist + Stock Tracker Auto Refresh — Final Fix

## Summary

Five integration issues addressed: category-local watchlist ranks, auto market value for Stock & ETF Tracker, scheduled price refreshes, independent Auto Watchlist screener with API limitation disclosure, and Data Health accuracy fixes.

---

## Issue 1 — Watchlist Category-Local Ranking

**Problem:** Pullbacks showed global ranks (PG #20, V #21) instead of 1–7 within category.

**Fix:**
- `resolveCategoryDisplayRank()` in `lib/watchlist/watchlist-rank.ts` always uses canonical seed ranks from `categories.ts` for the default 25 tickers; never uses global `sort_order` as visible rank.
- All views use `resolveDisplayRank()` / `priorityRank` from scanner rows: Category Table, Analysis Grid, Full Table, Detail Cards.
- Migration `supabase/migrations/20260609170000_watchlist_category_rank_fix.sql` sets correct `priority_rank` per category in DB.

**Expected ranks (PULLBACK example):** TMUS #1, NFLX #2, PG #3, V #4, MA #5, ACN #6, INTU #7.

---

## Issue 2 — Stock & ETF Tracker Auto Market Value

**Formulas:**
- Current Value = Shares × latest completed market price
- P/L = Current Value + Dividend − Capital
- ROI = P/L ÷ Capital × 100

**Implementation:**
- `lib/stocks-etfs/market-price-provider.ts` — US (Yahoo/FMP) and SG (Yahoo `.SI`) price fetch
- `lib/stocks-etfs/sg-yahoo-symbol.ts` — DBS→D05.SI, C38U, A17U, ES3 mappings
- `lib/stocks-etfs/sync-holding-market-prices.ts` — per-user sync with `manual_value_override` respect
- `lib/stocks-etfs/map-holding.ts` — read path computes value from `shares × last_market_price_native`
- `components/stocks-etfs/StockEtfHoldingsTable.tsx` — **Shares** column added
- `app/actions/stock-etf.ts` — `refreshStockMarketPricesAction()` for manual refresh
- Migration `supabase/migrations/20260609180000_stock_etf_market_price.sql` — price columns on `stock_etf_holdings`

Capital and Shares remain editable; dividend from Dividend Tracker.

---

## Issue 3 — Auto Refresh Schedule

| Region | Schedule (SGT) | UTC Cron | Route |
|--------|----------------|----------|-------|
| US Stocks/ETFs | 06:00 daily | `0 22 * * *` | `/api/cron/us-stock-prices` |
| SG Stocks | 17:30 daily | `30 9 * * *` | `/api/cron/sg-stock-prices` |
| Watchlist Scanner | 06:00 daily | `0 22 * * *` | `/api/cron/watchlist-refresh` |

- US refresh skips until NYSE session closed (completed daily candle only).
- Logs written to `data_source_logs` as `us_stock_etf_prices` and `sg_stock_prices`.
- Config: `lib/stocks-etfs/scheduled-refresh-config.ts`
- Runner: `lib/stocks-etfs/run-scheduled-stock-price-refresh.ts`
- `vercel.json` updated with all three crons.

**Data Health cards:**
- `auditUsStockEtfPrices()` — last refresh, rows updated, failed tickers
- `auditSgStockPrices()` — last refresh, rows updated, failed tickers

---

## Issue 4 — Auto Watchlist Independent Source

**Problem:** Auto Watchlist appeared to mirror manual watchlist.

**Fix:**
- Screener uses `AUTO_WATCHLIST_SCREENING_TICKERS` (~120 broad US symbols) fetched live from Yahoo/FMP — **not** manual watchlist, scanner, or mock.
- `manualWatchlistTickers` is only used for “Add to List” overlap badges in UI.
- `screenerMode: "limited_universe"` and `screenerWarning` on `AutoWatchlistPageData`.
- Amber banner on Auto Watchlist page: **“Needs API / Limited Data”** — free Yahoo/FMP cannot provide true full-market screener; paid screener API required for full universe.
- Data Health Auto Watchlist audit shows “Limited universe” status.

Screeners (from fixed universe):
- Mega Cap Leaders: cap ≥ $200B, top 10 by cap
- Mega Cap Pullback: cap ≥ $200B, 1Y return < 0%, top 5
- Large Cap Pullback: $100B–$199B, 1Y < 0%, top 3
- Mid/Large Cap Pullback: $10B–$50B, 1Y < 0%, top 3

---

## Issue 5 — Data Health Stale / Missing Indicators

**Root cause:** Health checks fetched all `market_data` rows (PostgREST 1000-row cap with ~260 candles × 25 tickers) and compared max dates incorrectly, marking most tickers stale even when completed candle existed.

**Fix:**
- `scanner-status.ts` and `auditMarketData()` now query only `price_date = completedCandleTarget` (25 rows max).
- Separates **unsupported/failed** tickers (from source breakdown) from **missing candle** and **missing indicators**.
- Watchlist Scanner health card lists failed vs missing candle vs missing indicators distinctly.

**To restore full health after deploy:** Run **Refresh Market Data** on Data Health or wait for 06:00 SGT cron — sync stores 260 completed candles and computes indicators (requires ~200 candles for SMA200).

---

## Validation Checklist

### Watchlist
- [ ] ETF = 5, SECTOR_LEADER = 6, TOP7 = 7, PULLBACK = 7 (total 25)
- [ ] Ranks reset 1–N within each category in Category View, Analysis Grid, Detail Cards, Full Table

### Stock & ETF Tracker
- [ ] Current Value = Shares × market price (after Refresh Prices or cron)
- [ ] P/L and ROI formulas match spec
- [ ] US ETF, US Stock, SG Stock tabs all update

### Auto Watchlist
- [ ] Amber “Limited Data” warning visible
- [ ] Results differ from manual watchlist categories
- [ ] Source badge shows Yahoo / FMP / Mixed from live fetch

### Data Health
- [ ] Market Data shows tickers with completed-candle row count (not false stale)
- [ ] US Stock/ETF and SG Stock price refresh cards present
- [ ] Failed tickers listed with reason after refresh

---

## Build

```bash
npm run build
```

**Status:** Passed (Next.js 16.2.7, TypeScript clean).

---

## Apply Migrations

```bash
supabase db push
# or apply manually:
# 20260609170000_watchlist_category_rank_fix.sql
# 20260609180000_stock_etf_market_price.sql
```

---

## Key Files

| Area | Files |
|------|-------|
| Ranking | `lib/watchlist/watchlist-rank.ts`, `watchlist-scanner.ts`, watchlist UI components |
| Stock prices | `lib/stocks-etfs/market-price-provider.ts`, `sync-holding-market-prices.ts`, `run-scheduled-stock-price-refresh.ts` |
| Cron | `app/api/cron/us-stock-prices/route.ts`, `sg-stock-prices/route.ts`, `vercel.json` |
| Auto watchlist | `lib/auto-watchlist/build-from-universe.ts`, `AutoWatchlistClient.tsx` |
| Data health | `lib/watchlist/scanner-status.ts`, `lib/data-health/audit-sources.ts` |
