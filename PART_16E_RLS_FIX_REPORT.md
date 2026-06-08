# Part 16E — RLS Fix Report: `daily_portfolio_snapshots`

**Date:** 2026-06-08  
**Error:** `new row violates row-level security policy for table "daily_portfolio_snapshots"`  
**Location:** `lib/supabase/queries/daily-portfolio-snapshots.ts` → `upsertDailyPortfolioSnapshot`

---

## Executive Summary

RLS policies on `daily_portfolio_snapshots` were **already correct** (`user_id = auth.uid()`). The failure occurred because the app wrote rows using `SUPABASE_DEV_USER_ID` **without an active Supabase Auth session**, so `auth.uid()` was `NULL` while `user_id` was a valid UUID.

**Fix:** Require Auth session for all live Supabase reads/writes; split RLS into explicit SELECT/INSERT/UPDATE/DELETE policies; add `upsert_system_daily_portfolio_snapshot` RPC; graceful mock fallback when unsigned in.

---

## 1. Table Inspection: `daily_portfolio_snapshots`

### Actual schema (not simplified names)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → `auth.users` | RLS key |
| `snapshot_date` | DATE | UNIQUE with `user_id` |
| `portfolio_value_sgd` | NUMERIC | **My Portfolio Value** (excludes client capital) |
| `stock_options_value_sgd` | NUMERIC | Legacy aggregate |
| `crypto_value_sgd` | NUMERIC | Crypto holdings value |
| `usd_cash` | NUMERIC | Manual Trading Cash USD (reference) |
| `sgd_cash` | NUMERIC | Manual Trading Cash SGD (calculations) |
| `usd_cash_sgd_equivalent` | NUMERIC | Deprecated — write 0 |
| `crypto_cash_sgd` | NUMERIC | Crypto cash pool |
| `us_etf_value_sgd` | NUMERIC | |
| `us_stock_value_sgd` | NUMERIC | |
| `sg_stock_value_sgd` | NUMERIC | |
| `current_options_value_sgd` | NUMERIC | Personal options MTM |
| `trading_cash_sgd` | NUMERIC **GENERATED** | `= sgd_cash` |
| `trading_capital_sgd` | NUMERIC **GENERATED** | US ETF + US Stock + SG Stock + sgd_cash + options |
| `open_risk` | NUMERIC | |
| `available_risk_capacity` | NUMERIC | |
| `personal_unrealized_pnl` | NUMERIC | |
| `personal_realized_pnl` | NUMERIC | |
| `client_pnl` | NUMERIC | |
| `client_initial_capital_sgd` | NUMERIC | |
| `client_current_value_sgd` | NUMERIC | |
| `total_assets_managed_sgd` | NUMERIC **GENERATED** | portfolio + client current |
| `portfolio_health_score` | NUMERIC | nullable |
| `notes` | TEXT | nullable |
| `is_manual_entry` | BOOLEAN | Manual vs system snapshot |
| `entered_by` | ENUM | `user` \| `system` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### User-requested name mapping

| Requested name | Actual column(s) |
|----------------|------------------|
| `portfolio_value` | `portfolio_value_sgd` |
| `stock_value` | `stock_options_value_sgd` + `us_etf/stock/sg_*` |
| `crypto_value` | `crypto_value_sgd` |
| `trading_cash_sgd` | `sgd_cash` (source) / `trading_cash_sgd` (generated) |
| `trading_cash_usd` | `usd_cash` |
| `trading_capital` | `trading_capital_sgd` (generated) |
| `available_risk` | `available_risk_capacity` |
| `open_risk` | `open_risk` |

**Migrations:** `20260606300000_daily_portfolio_snapshots.sql` (create) → Phase 16C extensions → `20260608120000_trading_cash_manual_refinement.sql` (generated columns)

---

## 2. RLS Policies (Before 16E)

Single policy from `20260607220900_advisor_warning_cleanup.sql`:

```sql
CREATE POLICY "Users manage own daily_portfolio_snapshots"
  ON public.daily_portfolio_snapshots FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
```

This already enforces `user_id = auth.uid()` for SELECT, INSERT, UPDATE, DELETE, and UPSERT.

**RLS was not disabled** (correct — must stay enabled).

---

## 3. Root Cause

### The `SUPABASE_DEV_USER_ID` trap

| Step | What happened |
|------|---------------|
| 1 | App reads `SUPABASE_DEV_USER_ID` from `.env.local` |
| 2 | `resolveSupabaseWriteUserId()` returned that UUID |
| 3 | Server client uses **anon key + cookies** — no Auth JWT |
| 4 | Postgres sees `auth.uid() = NULL` |
| 5 | Row insert has `user_id = <dev-uuid>` |
| 6 | RLS `WITH CHECK (auth.uid() = user_id)` **fails** |

`SUPABASE_DEV_USER_ID` is a **documentation hint** for which `auth.users` row to sign in as. It is **not** an RLS bypass.

### Additional protection

Trigger `trg_protect_manual_daily_snapshot` blocks auto-overwrite of manual entries (UPDATE/DELETE). System inserts are allowed when authenticated.

---

## 4. Fixes Applied (Part 16E)

### Migration: `20260608130000_daily_portfolio_snapshots_rls_fix.sql`

1. **Explicit RLS policies** (replaces single `FOR ALL`):
   - `daily_portfolio_snapshots_select_own`
   - `daily_portfolio_snapshots_insert_own`
   - `daily_portfolio_snapshots_update_own`
   - `daily_portfolio_snapshots_delete_own`

   All use: `(SELECT auth.uid()) = user_id`

2. **RPC:** `upsert_system_daily_portfolio_snapshot(jsonb)`
   - `SECURITY DEFINER` but validates `auth.uid() = user_id`
   - Skips overwrite when `is_manual_entry = TRUE`
   - Sets `entered_by = 'system'`, `is_manual_entry = FALSE`
   - Granted to `authenticated` role

### App changes

| File | Change |
|------|--------|
| `lib/supabase/resolve-user.ts` | `resolveSessionUserId()` — Auth session only; dev UUID no longer used for writes |
| `lib/supabase/queries/daily-portfolio-snapshots.ts` | System upsert via RPC; RLS error → mock fallback + warning |

---

## 5. How to Run Locally with Live Supabase

### Option A — Sign in (recommended)

1. Create a user in Supabase Auth (or use existing).
2. Set `SUPABASE_DEV_USER_ID=<that-user-uuid>` in `.env.local` (documentation only).
3. **Sign in** through the app so `auth.uid()` matches `user_id`.
4. Apply migration: `supabase db push` or run `20260608130000_daily_portfolio_snapshots_rls_fix.sql`.

### Option B — Mock mode (no Auth)

Leave Supabase unconfigured OR stay unsigned in → app uses in-memory mock snapshots (no RLS, no crash).

### Option C — Service role (NOT used in app)

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. Reserved for admin scripts only — **not** wired into dashboard writes per project rules.

---

## 6. Verification Checklist

After applying migration and signing in:

- [ ] Portfolio dashboard loads without RLS error
- [ ] `upsertDailyPortfolioSnapshot` creates/updates system row for today
- [ ] Manual snapshot via Goals → `upsert_manual_daily_portfolio_snapshot` RPC still works
- [ ] Manual snapshot is not overwritten on dashboard refresh
- [ ] Unsigned session → mock fallback, console warning (no crash)

---

## 7. Related Files

```
supabase/migrations/20260608130000_daily_portfolio_snapshots_rls_fix.sql
supabase/migrations/20260607220800_manual_data_protection_hardening.sql  (manual RPC + trigger)
lib/supabase/resolve-user.ts
lib/supabase/queries/daily-portfolio-snapshots.ts
PROJECT_RULES.md  (portfolio history rules)
```

---

## 8. Status

| Item | Status |
|------|--------|
| RLS policies explicit | ✅ Migration added |
| System upsert RPC | ✅ Migration added |
| App requires Auth session | ✅ Fixed |
| Dev UUID documented as non-bypass | ✅ This report + code comments |
| RLS disabled | ❌ Not done (intentionally) |
| `npm run build` | ✅ Run after changes |

**Next step for developer:** Apply migration to remote Supabase, then sign in as the dev user before testing live writes.
