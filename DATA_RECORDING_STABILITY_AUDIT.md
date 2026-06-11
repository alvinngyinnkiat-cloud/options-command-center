# Data Recording Stability Audit

Audit date: 2026-06-08  
Scope: Create, Edit, Delete, Save, and refresh persistence across nine data-recording modules.

## Summary

All modules persist through Supabase server actions and query layers. No module uses `localStorage` for CRUD. Mock in-memory stores apply only when Supabase is not configured (local dev without credentials).

Fixes in this pass targeted **silent write failures** (configured Supabase but no auth falling back to mock/no-op), **missing cascade deletes**, **stale cache after saves**, and **UI handlers that ignored `success: false`**.

---

## Module Audit Matrix

| Module | Table(s) Used | Create Tested | Edit Tested | Delete Tested | Refresh Tested | Issue Found | Issue Fixed |
|--------|---------------|---------------|-------------|---------------|----------------|-------------|-------------|
| Monthly Contributions | `monthly_contributions` | Code path ✓ | Code path ✓ | Code path ✓ | Code path ✓ | Delete handler ignored failures | Yes — surfaces `result.error` |
| Portfolio Dashboard Manual Inputs | `portfolio_overrides` | Code path ✓ | Code path ✓ | N/A | Code path ✓ | Goals page stale after manual save | Yes — `revalidatePath("/goals")` |
| Stock & ETF Tracker | `stock_etf_holdings`, `stock_etf_transactions`, `stock_etf_position_adjustments`, `stock_etf_ledger` | Code path ✓ | Code path ✓ | Code path ✓ | Code path ✓ | Position delete with history did not remove ledger rows; ledger delete UI ignored errors; ledger insert swallowed missing-table errors | Yes — cascade ledger delete; error surfacing; strict insert errors |
| Crypto Tracker | `crypto_holdings`, `crypto_transactions`, `portfolio_overrides` | Code path ✓ | Code path ✓ | Code path ✓ | Code path ✓ | Holding sync read mock cash before DB; goals stale after crypto saves | Yes — `getCurrentCryptoBalances()`; `revalidatePath("/goals")` |
| Dividend Tracker | `dividend_records` | Code path ✓ | Code path ✓ | Code path ✓ | Code path ✓ | Delete/sync ignored failures | Yes — surfaces `result.error` |
| Options Trade Tracker | `options_trades`, `client_trade_allocations` | Code path ✓ | Code path ✓ | Code path ✓ | Code path ✓ | Trade drawer actions refreshed UI even on failure | Yes — checks `success` before refresh |
| Client Profit Sharing | `client_profiles`, `client_trade_allocations` | Code path ✓ | Code path ✓ | Code path ✓ | Code path ✓ | Write fallbacks no-op or wrote mock when Supabase configured; toggle/payment UI ignored errors | Yes — `assertSupabaseWriteAccess()`; UI error handling |
| Financial Goals | `financial_goals`, `financial_goal_changes` | Code path ✓ | Code path ✓ | Code path ✓ | Code path ✓ | Archive/restore/delete ignored failures | Yes — surfaces `result.error` |
| Watchlist Manual Inputs | `watchlist`, `support_resistance` | Code path ✓ | Code path ✓ | Code path ✓ | Code path ✓ | Remove ticker ignored failures | Yes — surfaces `result.error` |

**Testing method:** Static code-path audit tracing server actions → query layers → Supabase tables, plus verification that UI handlers propagate `{ success, error }` results. Live Supabase integration tests require configured credentials and an authenticated session.

---

## Per-Module Notes

### 1. Monthly Contributions
- **Actions:** `createMonthlyContribution`, `updateMonthlyContribution`, `deleteMonthlyContribution`
- **Auth:** `requireUserId()` on writes
- **Fields:** month, stocks/options SGD, crypto SGD, notes, year filter via page query

### 2. Portfolio Dashboard Manual Inputs
- **Actions:** `savePortfolioOverride`, `saveManualTradingCash`, `saveManualClientPortfolio`
- **Auth:** `getPortfolioOverrideWriteContext()` throws when unauthenticated
- **Revalidation:** `/`, `/risk`, `/goals`

### 3. Stock & ETF Tracker
- **Position CRUD:** ticker, capital invested, current value, dividend, fees, notes via `persistStockEtfHolding` and position adjustment flows
- **Delete with history:** now removes transactions, adjustments, **and** ledger entries
- **Buy/sell:** primary history in `stock_etf_transactions`; ledger is secondary audit trail

### 4. Crypto Tracker
- **Fields:** ticker, capital invested, current value, fees, crypto cash (manual on dashboard)
- **Close/restore:** `removeCryptoHolding` / `persistCryptoHolding` with status flags
- **Portfolio sync:** holdings totals upserted to `portfolio_overrides` after holding changes

### 5. Dividend Tracker
- **US/SG:** `dividend_records.market` distinguishes markets
- **Summary cards:** derived client-side from loaded records (auto-update on successful save/delete)
- **Writes:** `requireSupabaseForWrite()` throws instead of silent mock

### 6. Options Trade Tracker
- **Open/closed:** `closeOptionsTrade`, status fields on `options_trades`
- **Client allocation sync:** `syncClientTradeAllocation` on save; throws when write access missing

### 7. Client Profit Sharing
- **Calculations:** allocation rows rebuilt from trade P/L on sync; payments update `client_profiles.total_paid_to_client`
- **All write fallbacks** now throw via `assertSupabaseWriteAccess()`

### 8. Financial Goals
- **CRUD + archive:** `financial_goals` with change log in `financial_goal_changes`
- **Dashboard reads:** Supabase primary with empty mock when unconfigured

### 9. Watchlist Manual Inputs
- **Fields:** support, resistance, notes, priority, category via `watchlist` + `support_resistance` tables
- **Existing editors** (`SupportResistanceEditor`, `WatchlistTickerSettings`) already checked `success`

---

## Systemic Patterns (Remaining Limitations)

1. **Unconfigured Supabase:** Writes go to in-memory mock stores and are lost on server restart. UI should show mock/empty data source indicators.
2. **Read errors:** Many list queries still return `[]` on Supabase errors instead of surfacing failure to the UI (`readSupabasePrimary` catch → mock).
3. **Optional ledger table:** If `stock_etf_ledger` migration is missing, buy/sell now throws rather than silently succeeding — run migrations for full audit trail.
4. **No automated E2E:** This audit verified code paths; production validation requires manual CRUD smoke tests with live Supabase auth.

---

## Files Changed

- `lib/supabase/resolve-user.ts` — `assertSupabaseWriteAccess()`
- `lib/supabase/queries/stock-etf-holdings.ts` — ledger cascade on delete
- `lib/supabase/queries/stock-etf-ledger.ts` — strict errors on insert/auth fallback
- `lib/supabase/queries/client-profit-sharing.ts` — throw on write fallbacks
- `app/actions/crypto.ts` — fix override sync; revalidate goals
- `app/actions/portfolio.ts` — revalidate goals
- `components/trades/TradeDetailDrawer.tsx`
- `components/client-profit-sharing/ClientTradeAllocationTable.tsx`
- `components/client-profit-sharing/ClientProfilePanel.tsx`
- `components/stocks-etfs/StockEtfTransactionHistoryTable.tsx`
- `components/contributions/MonthlyContributionsTable.tsx`
- `components/dividends/DividendTrackerClient.tsx`
- `components/goals/GoalSettingsPanel.tsx`
- `components/watchlist/WatchlistCategoryTable.tsx`
