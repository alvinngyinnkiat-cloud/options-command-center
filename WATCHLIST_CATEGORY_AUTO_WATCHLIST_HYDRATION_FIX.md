# Watchlist Category, Auto Watchlist, and Hydration Fix

## Summary

Three fixes shipped together:

1. **Manual Watchlist** — 4 editable categories, 25 default tickers, `priority_rank`, full CRUD from Supabase
2. **Auto Watchlist** — Independent Yahoo/FMP market universe screener (no longer reads manual watchlist)
3. **Header Clock** — Client-only live clock with SSR placeholder (no hydration mismatch)

---

## 1. Manual Watchlist Categories

### Category codes (Supabase `watchlist.watchlist_category`)

| Code | Display label |
|------|----------------|
| `ETF` | ETF |
| `SECTOR_LEADER` | SECTOR LEADERS |
| `TOP7` | TOP 7 |
| `PULLBACK` | PULLBACKS |

### Default universe (25 tickers)

Seeded by `ensureDefaultWatchlistItems()` — DB is source of truth; UI reads from Supabase, not hardcoded cards.

- **ETF (5):** XSP, MGK, QQQ, IWM, GLD
- **SECTOR LEADERS (6):** JPM, CAT, WMT, UNH, XOM, HD
- **TOP 7 (7):** AAPL, MSFT, NVDA, AVGO, AMZN, META, GOOG
- **PULLBACKS (7):** TMUS, NFLX, PG, V, MA, ACN, INTU

### New field: `priority_rank`

- Migration: `supabase/migrations/20260609140000_watchlist_priority_rank_categories.sql`
- Lower number = higher personal preference within category
- Scanner sorts by `priority_rank` within each category
- Editable in **WatchlistTickerSettings** (expanded row on category table)

### Category management actions

| Action | API |
|--------|-----|
| Add ticker | `addWatchlistTicker(ticker, category)` |
| Remove ticker | `removeWatchlistTicker(watchlistId)` |
| Update category / rank / notes / active | `updateWatchlistItem(...)` |
| Manual S/R | `saveSupportResistance(...)` — unchanged, never overwritten by sync |

---

## 2. Watchlist Scanner

- Uses **all active** manual watchlist tickers across 4 categories
- Header shows **N Active Tickers** from live Supabase rows
- Category summary cards show tickers from DB (not static defaults)
- Preserves manual daily/weekly S/R, notes, priority rank
- Market data sync still only updates OHLCV + indicators — **never** S/R or notes

---

## 3. Auto Watchlist Architecture (Fixed)

### Before (incorrect)

```
Manual Watchlist Scanner → Auto Watchlist Results
```

### After (correct)

```
Yahoo/FMP Market Universe → Market Screener → auto_watchlist_results → UI
```

### Screener rules (`lib/auto-watchlist/screener.ts`)

| Category | Rules | Limit |
|----------|-------|-------|
| Mega Cap Leaders | Market cap ≥ $200B, sort by cap desc | 10 |
| Mega Cap Pullback | Cap ≥ $200B, 1Y return < 0% | 5 |
| Large Cap Pullback | Cap $100B–$199B, 1Y return < 0% | 3 |
| Mid/Large Cap Pullback | Cap $10B–$50B, 1Y return < 0% | 3 |

### Data source (`lib/auto-watchlist/market-universe-provider.ts`)

1. **Yahoo Finance** — quoteSummary + 1Y chart (primary)
2. **FMP profile** — fallback when Yahoo fails
3. **Mock universe** — fallback when both fail

Stored per row: `auto_watchlist_results.data_source` = `yahoo` | `fmp` | `mock` | `mixed`

Auto Watchlist refresh **never** reads or modifies the manual `watchlist` table.

---

## 4. Hydration Fix

**File:** `components/layout/LiveMarketClock.tsx`

- `'use client'` with `mounted` gate
- SSR / pre-hydration: placeholder `--:-- PM SGT`
- Live clock starts **after** `useEffect` mount
- Updates every 1 second post-mount
- No `new Date()` rendered on server

---

## 5. Key Files

| File | Change |
|------|--------|
| `lib/watchlist/categories.ts` | 25-ticker defaults, category codes, labels |
| `lib/watchlist/ensure-default-watchlist.ts` | Seed/sync all 25 with priority |
| `lib/auto-watchlist/market-universe-provider.ts` | Yahoo/FMP universe fetch |
| `lib/auto-watchlist/build-from-universe.ts` | Screener entry point |
| `lib/supabase/queries/auto-watchlist.ts` | Uses market universe (not scanner) |
| `app/actions/watchlist.ts` | `updateWatchlistItem` |
| `components/watchlist/WatchlistTickerSettings.tsx` | Category/rank/notes editor |
| `components/layout/LiveMarketClock.tsx` | Hydration-safe clock |

---

## 6. Verification

```bash
npx vitest run lib/watchlist/categories.test.ts lib/auto-watchlist/screener.test.ts
npm run build
```

Checklist:

- [ ] No hydration error in browser console
- [ ] Header clock updates every second after mount
- [ ] Manual watchlist shows 25 active tickers (after seed)
- [ ] Category cards match Supabase data
- [ ] Add / remove / edit category / priority / notes works
- [ ] Manual S/R preserved after market refresh
- [ ] Auto Watchlist badge shows Yahoo/FMP/mixed (not watchlist scanner)
- [ ] Auto Watchlist works with empty manual watchlist

---

## Expected Result

- Manual and Auto watchlists are **independent**
- Manual watchlist is fully editable from Supabase
- Auto Watchlist screens Yahoo/FMP market universe
- Header clock has **no hydration mismatch**
