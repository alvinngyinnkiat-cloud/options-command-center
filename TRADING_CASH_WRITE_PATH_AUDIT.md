# Trading Cash Write Path Audit

**Error observed:**  
`portfolio_overrides is manual only — blocked for automated/system requests`

**Status:** Investigation only — no code or database changes.

---

## Executive summary

Trading Cash save **intentionally writes to `portfolio_overrides`**. That is the canonical schema location for `manual_trading_cash_usd` and `manual_trading_cash_sgd`.

The error is **not** caused by writing to the wrong table. It is caused by the **`protect_portfolio_overrides_manual()` trigger** rejecting the session because:

```
NOT is_authenticated_user_request()
AND NOT is_user_initiated()
```

In **dev service-role mode**, this happens when migration `20260608140000` has **not** been applied to the remote database. Migration `209` only treats `authenticated` JWT sessions as user requests; `service_role` is classified as a system request and is blocked.

---

## 1. Table Trading Cash writes to

| Layer | Target |
|-------|--------|
| **Server action** | `saveManualTradingCash()` in `app/actions/portfolio.ts` |
| **Database table** | **`public.portfolio_overrides`** |
| **Operation** | `upsert(..., { onConflict: "user_id" })` |
| **Columns updated** | `manual_trading_cash_usd`, `manual_trading_cash_sgd`, `manual_cash_value_sgd`, `override_updated_at`, `updated_at` (+ preserved override fields from existing row) |

Schema origin: `supabase/migrations/20260608120000_trading_cash_manual_refinement.sql`

```sql
ALTER TABLE public.portfolio_overrides
  ADD COLUMN IF NOT EXISTS manual_trading_cash_usd NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS manual_trading_cash_sgd NUMERIC(14, 2);
```

**UI entry point:** `components/portfolio/ManualTradingCashCard.tsx` → calls `saveManualTradingCash`.

**Related but separate:** After a successful override save, `savePortfolioOverride` may call `upsertDailyPortfolioSnapshot`, which writes `sgd_cash` on **`daily_portfolio_snapshots`**. Trading Cash card save does **not** write snapshots directly; it only updates `portfolio_overrides`.

---

## 2. Why `portfolio_overrides` validation is triggered

Every INSERT, UPDATE, or DELETE on `portfolio_overrides` runs **BEFORE** triggers that call `protect_portfolio_overrides_manual()`.

**Migration chain:**

| Migration | What it adds |
|-----------|--------------|
| `20260607220800_manual_data_protection_hardening.sql` | Creates trigger on `portfolio_overrides` |
| `20260607220900_advisor_warning_cleanup.sql` | Hardens trigger function + `is_authenticated_user_request()` |

**Trigger logic:**

```sql
CREATE OR REPLACE FUNCTION public.protect_portfolio_overrides_manual()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_authenticated_user_request() AND NOT public.is_user_initiated() THEN
    RAISE EXCEPTION
      'portfolio_overrides is manual only — blocked for automated/system requests';
  END IF;
  -- ...
END;
$$;
```

**Triggers:**

- `trg_protect_portfolio_overrides_insert` — BEFORE INSERT
- `trg_protect_portfolio_overrides_update` — BEFORE UPDATE
- `trg_protect_portfolio_overrides_delete` — BEFORE DELETE

Trading Cash save performs an **upsert** → fires **INSERT or UPDATE** → trigger always runs → validation always runs.

### Pass conditions (either one must be true)

| Helper | Passes when |
|--------|-------------|
| `is_authenticated_user_request()` | See migration version below |
| `is_user_initiated()` | `current_setting('app.user_initiated', true) = 'true'` (set by manual snapshot RPC, **not** by Trading Cash save) |

### `is_authenticated_user_request()` by migration version

**After migration 209 only** (`20260607220900`):

```sql
SELECT auth.role() = 'authenticated' AND (SELECT auth.uid()) IS NOT NULL;
```

**After migration 08140000** (`20260608140000_portfolio_override_dev_service_role.sql`):

```sql
SELECT
  (auth.role() = 'authenticated' AND (SELECT auth.uid()) IS NOT NULL)
  OR auth.role() = 'service_role';
```

### Error progression (typical dev timeline)

| Stage | Session role | Error |
|-------|--------------|-------|
| Before Phase 16G.3 app fix | `anon` | `permission denied for function is_authenticated_user_request` |
| After app routes to service role, **without** migration 08140000 | `service_role` | **`portfolio_overrides is manual only — blocked for automated/system requests`** ← current error |
| After app fix **and** migration 08140000 applied | `service_role` | Should pass |
| Production with signed-in user | `authenticated` | Should pass |

---

## 3. Is Trading Cash incorrectly routed through `portfolio_overrides`?

### Verdict: **No — routing matches schema design**

Trading Cash is **not** misrouted. The application and migrations deliberately store trading cash on `portfolio_overrides`:

- `PROJECT_RULES.md` §4 references `portfolio_overrides.manual_trading_cash_sgd` / `manual_trading_cash_usd`
- `manualTradingCashFromOverride()` in `lib/portfolio/capital-pools.ts` reads from override input
- No separate `trading_cash` table exists

### What *is* wrong

| Issue | Description |
|-------|-------------|
| **Session vs guard mismatch** | Dev writes use `service_role` (admin client), but DB guard (pre-08140000) only accepts `authenticated` or `app.user_initiated` |
| **Missing migration on remote** | Repo contains `20260608140000_portfolio_override_dev_service_role.sql`; if not pushed to Supabase, dev service-role saves still fail |
| **No user-initiated RPC for trading cash** | Unlike manual daily snapshots (`upsert_manual_daily_portfolio_snapshot` sets `app.user_initiated`), Trading Cash uses a raw table upsert |

### Not a separate-table problem

A dedicated table would duplicate override data and break the one-row-per-user override model. The fix is **session/trigger alignment**, not a new table.

---

## 4. Comparison with Financial Goals save path

### Financial Goals (`lib/supabase/queries/financial-goals.ts`)

```typescript
return withSupabaseQuery(
  async ({ userId: effectiveUserId, supabase }) => {
    await supabase.from("financial_goals").upsert(payload).select().single();
  },
  fallback
);
```

| Aspect | Financial Goals | Trading Cash |
|--------|-----------------|--------------|
| Write helper | `withSupabaseQuery` | `getPortfolioOverrideWriteContext()` (custom, same underlying clients) |
| Dev client | `createAdminClient()` → **service_role** | Same (after Phase 16G.3) |
| Production client | `createClient()` → **authenticated** JWT | Same |
| Target table | `financial_goals` | `portfolio_overrides` |
| Manual-protection trigger | **None** | **`protect_portfolio_overrides_manual()`** |
| Calls `is_authenticated_user_request()` | **No** | **Yes (via trigger)** |
| `app.user_initiated` set | **No** | **No** |

**Why Goals work in dev but Trading Cash fails:** Goals hit a table with RLS only. Trading Cash hits a table with an additional **manual-only trigger** that rejects `service_role` unless migration 08140000 is applied or `app.user_initiated` is set.

---

## 5. Current app write path (post Phase 16G.3)

```
ManualTradingCashCard.handleSave()
  → saveManualTradingCash()                    [app/actions/portfolio.ts]
    → getPortfolioOverrideWriteContext()
      → resolveSupabaseServerAccess()
          production-session  → userId = session UUID
          dev-service-role    → userId = SUPABASE_DEV_USER_ID
      → getServerSupabaseClient(access)
          production-session  → createClient()        (anon key + auth cookies)
          dev-service-role    → createAdminClient()   (SUPABASE_SERVICE_ROLE_KEY, server-only)
    → supabase.from("portfolio_overrides").upsert(...)
      → BEFORE INSERT/UPDATE trigger
        → protect_portfolio_overrides_manual()
          → is_authenticated_user_request()  ?
          → is_user_initiated()                false
```

**`user_id` on row:** `access.userId` (= `SUPABASE_DEV_USER_ID` in dev, session UUID in production).

---

## 6. Recommended correct write path

### Storage (keep as-is)

**Continue writing Trading Cash to `portfolio_overrides`.**  
Columns: `manual_trading_cash_usd`, `manual_trading_cash_sgd`.

### Application layer (already aligned)

Keep using:

- `resolveSupabaseServerAccess()`
- `getServerSupabaseClient()` / `createAdminClient()` in dev
- `createClient()` with auth session in production
- `user_id = SUPABASE_DEV_USER_ID` in dev

Optionally refactor to `withSupabaseQuery` for consistency with Financial Goals — behavior is equivalent.

### Database layer (required for dev service-role)

**Option A — Preferred (already in repo):**  
Apply migration `20260608140000_portfolio_override_dev_service_role.sql`:

1. `GRANT EXECUTE ON FUNCTION public.is_authenticated_user_request() TO service_role;`
2. Extend function to return `true` for `auth.role() = 'service_role'`

Does **not** grant `anon` any additional permissions.

**Option B — Stricter alternative:**  
Add RPC `upsert_portfolio_trading_cash(jsonb)` (SECURITY DEFINER) that:

```sql
PERFORM set_config('app.user_initiated', 'true', true);
-- upsert portfolio_overrides trading cash columns only
```

Passes via `is_user_initiated()` without widening `service_role` in `is_authenticated_user_request()`. More work; mirrors `upsert_manual_daily_portfolio_snapshot`.

### Production

Signed-in user → `authenticated` role → passes migration 209 guard without 08140000. No change needed if users authenticate normally.

---

## 7. Decision matrix

| Path | Dev service-role | Production authenticated | Anon widened? |
|------|------------------|--------------------------|---------------|
| **A: Apply 08140000** | ✅ | ✅ | ❌ |
| **B: user-initiated RPC** | ✅ | ✅ | ❌ |
| Raw upsert + 209 only | ❌ blocked | ✅ | ❌ |
| Grant anon EXECUTE | ❌ still blocked by trigger logic | — | ⚠️ Not recommended |

---

## 8. Files referenced

| File | Role |
|------|------|
| `app/actions/portfolio.ts` | `saveManualTradingCash`, `getPortfolioOverrideWriteContext` |
| `components/portfolio/ManualTradingCashCard.tsx` | UI save handler |
| `lib/supabase/server-write.ts` | Dev/production client resolution |
| `lib/supabase/admin.ts` | Service-role client (server-only) |
| `lib/supabase/queries/financial-goals.ts` | Working write pattern reference |
| `supabase/migrations/20260607220800_manual_data_protection_hardening.sql` | Trigger creation |
| `supabase/migrations/20260607220900_advisor_warning_cleanup.sql` | Trigger + `is_authenticated_user_request()` (authenticated only) |
| `supabase/migrations/20260608120000_trading_cash_manual_refinement.sql` | Trading cash columns on `portfolio_overrides` |
| `supabase/migrations/20260608140000_portfolio_override_dev_service_role.sql` | Dev service-role fix (must be applied remotely) |

---

## 9. Immediate action for operator

1. Confirm remote Supabase has migration **`20260608140000`** applied (`supabase db push` or run SQL manually).
2. Retry Trading Cash save in dev with `SUPABASE_DEV_USER_ID` + `SUPABASE_SERVICE_ROLE_KEY` set.
3. If still failing, verify session mode in logs: dev should show `service_role`, not `anon`.

---

**End of audit — no changes made.**
