# Auto Watchlist Module Removal

## Reason

Yahoo/FMP free-tier data cannot provide a reliable full-market screener universe. The Auto Watchlist module was removed so the app focuses on the **Manual Watchlist Scanner** as the sole trading discovery tool.

---

## Removed UI

| Item | Location |
|------|----------|
| Auto Watchlist page route | `app/(dashboard)/auto-watchlist/page.tsx` (deleted) |
| Sidebar nav item | `lib/constants/navigation.ts` — removed from **Market Discovery** |
| Homepage quick nav shortcut | `lib/constants/quick-nav.ts` |
| Auto Watchlist dashboard/components | `components/auto-watchlist/` (entire folder deleted) |
| Data Health card | `auditAutoWatchlist()` removed from `lib/data-health/audit-sources.ts` |
| **Refresh Auto Watchlist** button | `components/data-health/DataHealthClient.tsx` |
| **Auto Watchlist Updated** status | `components/data-health/WatchlistScannerHealthCard.tsx` |

---

## Removed Logic

| Area | What was removed |
|------|------------------|
| Server actions | `app/actions/auto-watchlist.ts` |
| Supabase queries | `lib/supabase/queries/auto-watchlist.ts` |
| Screener module | `lib/auto-watchlist/` (screener, universe provider, Yahoo/FMP fetch, mock) |
| Mock stores | `lib/mock/auto-watchlist-store.ts`, `lib/mock/auto-watchlist-universe.ts` |
| Scheduled refresh | Auto watchlist step removed from `lib/watchlist/run-scheduled-watchlist-refresh.ts` |
| Cron response field | `autoWatchlistUpdated` removed from `/api/cron/watchlist-refresh` |
| Data Health action | `refreshAutoWatchlistHealth()` removed from `app/actions/data-health.ts` |
| Import/export bundle | Auto watchlist fetch removed from `lib/import-export/data-bundle.ts` |
| Scanner health | `autoWatchlistUpdated` field removed from `lib/watchlist/scanner-status.ts` |

No code path calls **Refresh Auto Watchlist**, **Generate Auto Watchlist**, or any auto watchlist provider.

---

## Data Health (after removal)

Monitored sources:

- Market Data
- Technical Indicator Data
- US Stock/ETF Price Refresh
- SG Stock Price Refresh
- Manual Data
- Options Trade Data
- Dividend Data
- Crypto Tracker

Removed from primary health UI:

- Auto Watchlist Data card
- Refresh Auto Watchlist button
- Auto Watchlist Updated scanner status

Historical `auto_watchlist` rows may still appear in the **Data Source Log** table from past runs; no new rows are written.

---

## Scheduled Refresh (unchanged for manual watchlist)

| Job | Schedule (SGT) | Route |
|-----|------------------|-------|
| Watchlist Scanner (market data + indicators) | 06:00 daily | `/api/cron/watchlist-refresh` |
| US Stock/ETF prices | 06:00 daily | `/api/cron/us-stock-prices` |
| SG Stock prices | 17:30 daily | `/api/cron/sg-stock-prices` |

Auto Watchlist is **no longer** part of the 06:00 watchlist cron.

---

## Database

**Not deleted** (historical data preserved, unused by app):

- `public.auto_watchlist_results`
- `public.auto_watchlist_runs` (if present from earlier migrations)

TypeScript types in `types/database.ts` remain for schema parity only. The application does not query these tables.

---

## Manual Watchlist Scanner (unchanged)

Primary discovery tool at **`/watchlist`**.

**Default universe (25 tickers):**

| Category | Tickers |
|----------|---------|
| ETF | XSP, MGK, QQQ, IWM, GLD |
| SECTOR_LEADER | JPM, CAT, WMT, UNH, XOM, HD |
| TOP7 | AAPL, MSFT, NVDA, AVGO, AMZN, META, GOOG |
| PULLBACK | TMUS, NFLX, PG, V, MA, ACN, INTU |

**Supported actions:**

- Add / remove ticker
- Change category
- Priority rank (category-local)
- Manual daily support/resistance
- Weekly support/resistance
- Notes
- Refresh market data (manual + 06:00 SGT cron)

---

## Build

```bash
npm run build
```

**Status:** Passed after removal.

---

## Verification Checklist

- [ ] No `/auto-watchlist` route (404 or redirect absent from nav)
- [ ] Sidebar **Market Discovery** shows Watchlist Scanner only (no Auto Watchlist)
- [ ] Data Health has no Auto Watchlist card or refresh button
- [ ] Watchlist Scanner health card has no “Auto Watchlist Updated” row
- [ ] 06:00 cron refreshes market data + indicators only
- [ ] Manual watchlist add/remove/category/rank/S-R still works
