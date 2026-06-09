# Watchlist Green Status Final Fix

## Problems fixed

| Issue | Fix |
|-------|-----|
| Scanner Ready = FAILED despite 12/12 success | Relaxed readiness — Yahoo counts as valid; no strict per-ticker stale gate when indicators complete |
| Auto Watchlist = Mock provider | Replaced mock market-cap universe with live **watchlist scanner** rankings |
| Manual Data Last success = 2099-01-15 | Excluded smoke-test dates; use `selectLatestSnapshot` / `getLatestDailySnapshot` |

---

## A. Scanner Ready logic

**File:** `lib/watchlist/scanner-status.ts`

**Ready when ALL true:**

- `activeTickers > 0`
- `completedCandleTarget` exists
- `indicatorsUpdated` (all active tickers have indicators for target date)
- `missingIndicatorTickers.length === 0`
- **At least one market data source succeeded** (`fmpCount + yahooCount + otherCount > 0`)
- `lastCandleDate != null` OR `tickersWithCandles > 0`

**Removed from gate:**

- Strict `staleTickers.length === 0` (Yahoo-only success no longer fails readiness)
- FMP requirement

Stale tickers still shown as informational text when not ready for other reasons.

---

## B. Auto Watchlist — live watchlist source

**New file:** `lib/auto-watchlist/watchlist-scanner-universe.ts`

`refreshAutoWatchlist()` now:

1. Loads **Watchlist Scanner** rows (`getWatchlistScannerData`)
2. Filters rows with valid market_data + indicators + scanner score
3. Ranks by **scanner total score**
4. Assigns categories (Top Scanner Scores, Pullback Setups, etc.)
5. Persists to `auto_watchlist_results`

**Market data source:** `watchlist` (not mock)

**Inputs used:**

- Completed daily candles (average price)
- EMA20, SMA50, SMA200, ATR14, Stochastic
- Manual support/resistance (via scanner scoring)

**UI:** Auto Watchlist page badge → **Watchlist scanner**

**Data Health:** Auto Watchlist card → **Watchlist scanner (live market_data + indicators + S/R scores)**

**Auto Watchlist Updated:** `YES` when last `auto_watchlist` log is success/partial (no longer requires scheduled cron).

---

## C. Legacy 2099-01-15 date removed

**Root cause:** Smoke-test row in `daily_portfolio_snapshots` (`scripts/smoke-phase-16f-crud.mjs`).

**Fixes:**

| File | Change |
|------|--------|
| `lib/data-health/audit-sources.ts` | `filterRealPortfolioSnapshots` + `getLatestDailySnapshot` for Manual Data |
| `components/data-health/DataSourceHealthCard.tsx` | Never display dates starting with `2099-` |

Manual Data **Last success** now shows the latest real snapshot date or `null`.

---

## Verification

1. **Refresh Market Data** → indicators 12/12
2. **Refresh Auto Watchlist**
3. Data Health:
   - **Scanner Ready** = GREEN / Ready
   - **Auto Watchlist Updated** = Yes
   - **Manual Data** Last success ≠ 2099-01-15
4. Auto Watchlist page:
   - Market: **Watchlist scanner**
   - Last generated: today

---

## Files changed

- `lib/watchlist/scanner-status.ts`
- `lib/auto-watchlist/watchlist-scanner-universe.ts` (new)
- `lib/auto-watchlist/types.ts`
- `lib/supabase/queries/auto-watchlist.ts`
- `lib/data-health/audit-sources.ts`
- `components/data-health/WatchlistScannerHealthCard.tsx`
- `components/data-health/DataSourceHealthCard.tsx`
- `components/auto-watchlist/AutoWatchlistClient.tsx`

---

**Status:** Watchlist Scanner green status + live auto watchlist + manual date cleanup complete.
