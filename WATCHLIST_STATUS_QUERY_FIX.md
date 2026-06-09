# Watchlist Status Query Fix

**Date:** 2026-06-08  
**Issue:** Data Health cards reported conflicting watchlist ticker counts  
**Status:** Fixed

---

## Symptom

| Card | Message |
|------|---------|
| **Watchlist Scanner** (top) | "No active watchlist tickers." |
| **Technical Indicator Data** | "3 watchlist tickers" |

Same page, same user — counts should match.

---

## 1. Queries found

### Watchlist Scanner card (top)

| Item | Detail |
|------|--------|
| **UI** | `components/data-health/WatchlistScannerHealthCard.tsx` |
| **Data loader** | `lib/watchlist/scanner-status.ts` → `getWatchlistScannerHealthStatus(userId)` |
| **Called from** | `lib/data-health/run-health-check.ts` |

**Before fix — active ticker query:**

```typescript
const supabase = await createClient();  // anon + cookie session
const { data: watchlist } = await supabase
  .from("watchlist")
  .select("id, ticker")
  .eq("user_id", userId)      // userId from page (dev UUID or MOCK_USER_ID)
  .eq("is_active", true);
```

Also queried `market_data` and `technical_indicators` via the same `createClient()`.

### Technical Indicator card

| Item | Detail |
|------|--------|
| **UI** | `components/data-health/DataSourceHealthCard.tsx` |
| **Audit** | `lib/data-health/audit-sources.ts` → `auditTechnicalIndicators(userId)` |
| **Ticker count source** | `getWatchlistScannerData().rows.length` |

**Before fix:**

```typescript
const scanner = await getWatchlistScannerData();
summary: `${scanner.rows.length} watchlist tickers · ...`
```

`getWatchlistScannerData()` uses `readSupabasePrimary` → `withSupabaseQuery` → `getServerSupabaseClient()`:

- **Production:** authenticated session client (`auth.uid()` matches RLS)
- **Dev:** service-role admin client when `SUPABASE_DEV_USER_ID` + `SUPABASE_SERVICE_ROLE_KEY` are set (bypasses RLS)

### Market Data card (related)

| Item | Detail |
|------|--------|
| **Audit** | `auditMarketData(userId)` |
| **Before fix** | `createClient()` + all watchlist rows (no `is_active` filter) |

---

## 2. Tables each card reads

| Card | Primary tables | Active ticker source (before) |
|------|----------------|-------------------------------|
| **Watchlist Scanner** | `watchlist`, `market_data`, `technical_indicators`, `data_source_logs` | `watchlist` via `createClient()` |
| **Technical Indicators** | Indirect: `getWatchlistScannerData()` joins `watchlist`, `market_data`, `support_resistance`, `technical_indicators` | Row count from scanner pipeline via `withSupabaseQuery` |
| **Market Data** | `watchlist`, `market_data` | All `watchlist` ids (inactive included) via `createClient()` |

---

## 3. Why counts differed

### Root cause: mismatched Supabase access paths

| Path | Client | RLS in dev (no browser sign-in) |
|------|--------|----------------------------------|
| `scanner-status.ts` (before) | `createClient()` — anon, no JWT | **Blocks** — `auth.uid()` is null → 0 rows |
| `getWatchlistScannerData()` | `withSupabaseQuery` → admin in dev | **Bypasses** RLS → returns real rows (e.g. 3) |

The page passes `userId` from `DataHealthDashboard`:

```typescript
const userId = (await resolveAuthenticatedUserId()) ?? MOCK_USER_ID;
```

That UUID is used as a **filter** in the scanner-status query, but RLS still requires **`auth.uid()`** on the Supabase client to match. Filtering by `user_id` does not override RLS when the client is unauthenticated.

Result:

- Top card: `activeTickers = 0` → footer text **"No active watchlist tickers."**
- Indicator card: scanner returns **3 rows** from DB via service role

### Secondary issues

1. **Technical card counted scanner rows**, not explicit active watchlist query — could diverge if mock fallback fired.
2. **Market Data card** included inactive watchlist entries (`is_active` not filtered).

---

## 4. Fix — standardized active ticker source

### New shared module

**`lib/watchlist/active-watchlist.ts`**

```typescript
fetchActiveWatchlistItems()  // watchlist WHERE user_id = access.userId AND is_active = true
countActiveWatchlistItems()
```

Uses **`withSupabaseQuery`** — same access path as `getWatchlistScannerData()`.

### Updated consumers

| File | Change |
|------|--------|
| `lib/watchlist/scanner-status.ts` | Active list + `market_data` / `technical_indicators` reads via `fetchActiveWatchlistItems()` + `withSupabaseQuery` |
| `lib/data-health/audit-sources.ts` | `auditMarketData` and `auditTechnicalIndicators` use `fetchActiveWatchlistItems()` / `countActiveWatchlistItems()` |
| `components/data-health/WatchlistScannerHealthCard.tsx` | Subtitle shows `{n} active tickers` |

### Standard summary format

All watchlist health surfaces now report:

```
{n} active watchlist tickers
```

Plus card-specific detail (OHLCV count, indicator source, etc.).

---

## 5. Verification

After fix, on Data Health page:

1. **Watchlist Scanner** subtitle: `3 active tickers · completed daily candles only`
2. **Technical Indicator Data** summary: `3 active watchlist tickers · ...`
3. **Market Data API** summary: `3 active · …` (or `3 active tickers · no OHLCV rows` if not refreshed)
4. Footer **"No active watchlist tickers"** only when DB truly has zero `is_active = true` rows

### Dev environment requirement

For live counts in dev without Supabase Auth sign-in:

```env
SUPABASE_DEV_USER_ID=<your-user-uuid>
SUPABASE_SERVICE_ROLE_KEY=<server-only-key>
```

Without these, all cards consistently show **0 active** (empty fallback), not mixed 0 vs 3.

---

## File reference

| File | Role |
|------|------|
| `lib/watchlist/active-watchlist.ts` | **Canonical** active ticker query |
| `lib/watchlist/scanner-status.ts` | Scanner health card data |
| `lib/data-health/audit-sources.ts` | Market Data + Technical Indicator audits |
| `lib/supabase/queries/watchlist-scanner.ts` | Scanner row assembly (same access path) |
| `lib/supabase/server-write.ts` | `withSupabaseQuery` / dev service-role |

---

## Stop

Fix applied and documented. Awaiting next instruction.
