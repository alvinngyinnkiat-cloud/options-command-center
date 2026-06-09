# Phase 16G.3 — Trading Cash Permission Fix Plan

**Error:** `permission denied for function is_authenticated_user_request`  
**Status:** Investigation complete — no code or database changes applied yet.

---

## 1. Migration 209 — `is_authenticated_user_request()`

**File:** `supabase/migrations/20260607220900_advisor_warning_cleanup.sql`

### Function definition

```sql
CREATE OR REPLACE FUNCTION public.is_authenticated_user_request()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.role() = 'authenticated' AND (SELECT auth.uid()) IS NOT NULL;
$$;
```

### SECURITY DEFINER status

| Property | Value |
|----------|--------|
| Security mode | **`SECURITY DEFINER`** |
| `search_path` | `public` (hardened in 209) |
| Owner | Not set explicitly → default **`postgres`** (migration runner) |
| Volatility | `STABLE` |

> **Note:** `SECURITY DEFINER` on this helper does **not** bypass the caller’s need for `EXECUTE`. Trigger functions that call it run as **`SECURITY INVOKER`** (default), so the **session role** must hold `EXECUTE` on `is_authenticated_user_request()`.

### Existing GRANT statements (migration 209, lines 148–150)

```sql
REVOKE ALL ON FUNCTION public.is_authenticated_user_request() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_authenticated_user_request() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_authenticated_user_request() TO authenticated;
```

**Not granted:** `service_role`, `postgres` (implicit owner privileges only apply when running as owner).

### Related trigger (same migration, lines 37–54)

`portfolio_overrides` is guarded by `protect_portfolio_overrides_manual()`:

```sql
IF NOT public.is_authenticated_user_request() AND NOT public.is_user_initiated() THEN
  RAISE EXCEPTION
    'portfolio_overrides is manual only — blocked for automated/system requests';
END IF;
```

Triggers (from migration 208, preserved in 209):

- `trg_protect_portfolio_overrides_insert` — BEFORE INSERT
- `trg_protect_portfolio_overrides_update` — BEFORE UPDATE
- `trg_protect_portfolio_overrides_delete` — BEFORE DELETE

---

## 2. Which role is executing?

| Environment | App client | DB session role | Can EXECUTE `is_authenticated_user_request()`? | Trigger outcome |
|-------------|------------|-----------------|------------------------------------------------|-----------------|
| **Dev, no Supabase Auth session** | `createClient()` (anon key, no JWT) | **`anon`** | ❌ Revoked in 209 | **Permission denied** ← current failure |
| **Dev, with `SUPABASE_DEV_USER_ID` + service role key** (if routed correctly) | `createAdminClient()` via `getServerSupabaseClient` | **`service_role`** | ❌ Never granted | **Permission denied** (then business-logic block if granted) |
| **Production / dev with signed-in user** | `createClient()` with session cookies | **`authenticated`** | ✅ Granted in 209 | ✅ Passes (`auth.uid()` set) |

### Determination for the reported error

The error string **`permission denied for function is_authenticated_user_request`** is a PostgreSQL **privilege** failure, not the trigger’s business-rule exception (`portfolio_overrides is manual only — blocked…`).

**Most likely executing role:** **`anon`** — because Trading Cash uses `createClient()` while `requireUserId()` succeeds via dev user ID without establishing an authenticated JWT on the Supabase client.

---

## 3. Which table does Save Trading Cash write to?

**Table:** `public.portfolio_overrides`

**Columns updated by Trading Cash save** (`saveManualTradingCash` in `app/actions/portfolio.ts`):

| Column | Purpose |
|--------|---------|
| `manual_trading_cash_usd` | Trading Cash USD (reference) |
| `manual_trading_cash_sgd` | Trading Cash SGD (calculations) |
| `manual_cash_value_sgd` | Legacy cash column (set to SGD value) |
| Other override fields | Preserved from existing row |

**Operation:** `upsert` on conflict `user_id`.

**Trigger fired:** `protect_portfolio_overrides_manual()` → calls `is_authenticated_user_request()`.

---

## 4. Which client does Trading Cash use?

**File:** `app/actions/portfolio.ts` — `saveManualTradingCash`

```typescript
const userId = await requireUserId();        // resolves dev user OR session user
const supabase = await createClient();       // always anon key + cookies
await supabase.from("portfolio_overrides").upsert(...)
```

| Client | Used? |
|--------|-------|
| **Anon client** (`createClient()` from `lib/supabase/server.ts`) | ✅ **Yes** — always |
| **Authenticated client** (same `createClient()` but with valid session JWT in cookies) | ⚠️ Only if user is signed in |
| **Service-role client** (`createAdminClient()` via `getServerSupabaseClient`) | ❌ **No** |

**Same issue affects:** `savePortfolioOverride` (line 157) — also uses `createClient()` directly.

---

## 5. Comparison — Financial Goals write path (working)

**File:** `lib/supabase/queries/financial-goals.ts` — `persistFinancialGoalRow`

```typescript
return withSupabaseQuery(
  async ({ userId: effectiveUserId, supabase }) => {
    await supabase.from("financial_goals").upsert(payload).select().single();
  },
  fallback
);
```

**File:** `lib/supabase/server-write.ts`

| Step | Behavior |
|------|----------|
| `resolveSupabaseServerAccess()` | Session user → `production-session`; else dev env + `SUPABASE_DEV_USER_ID` + `SUPABASE_SERVICE_ROLE_KEY` → `dev-service-role` |
| `getServerSupabaseClient(access)` | `dev-service-role` → **`createAdminClient()`** (service role); `production-session` → **`createClient()`** (authenticated JWT) |

**Why Goals work but Trading Cash does not:**

| Factor | Financial Goals | Trading Cash |
|--------|-----------------|--------------|
| Write helper | `withSupabaseQuery` | Raw `createClient()` |
| Dev client | Service role | Anon (no session) |
| Target table | `financial_goals` | `portfolio_overrides` |
| Manual-protection trigger | None | `protect_portfolio_overrides_manual()` |
| Calls `is_authenticated_user_request()` | No | Yes |

Goals succeed in dev because **`financial_goals` has no trigger** that invokes `is_authenticated_user_request()`, and service role bypasses RLS. Trading Cash fails because it uses **anon** and hits a trigger that requires **`EXECUTE` on a function revoked from anon**.

---

## 6. Fix options — safety analysis

### Option A — Grant `EXECUTE`

```sql
GRANT EXECUTE ON FUNCTION public.is_authenticated_user_request() TO service_role;
-- optionally: extend function body to return TRUE for service_role
```

| Pros | Cons |
|------|------|
| Small SQL-only change | Does **not** fix anon client if app keeps using `createClient()` without session |
| Unblocks service-role callers after app routes correctly | Grant alone: service role still fails trigger **logic** (`auth.role() != 'authenticated'`) → different error |
| Aligns with 209 intent for `authenticated` | Widening function to include `service_role` loosens manual-data guard slightly |

**Risk:** Low if combined with app routing; insufficient alone.

---

### Option B — Route through service-role write path

Refactor `saveManualTradingCash` and `savePortfolioOverride` to use the same pattern as Financial Goals:

```typescript
const access = await resolveSupabaseServerAccess();
if (!access) throw …;
const supabase = await getServerSupabaseClient(access);
// use access.userId for user_id column
```

| Pros | Cons |
|------|------|
| Matches established codebase convention | Dev mode still needs **Option A** (or RPC) because `service_role` lacks `EXECUTE` and fails trigger logic |
| Production signed-in users use authenticated JWT → works today | Does not change database |
| Fixes dev user ID vs `auth.uid()` mismatch for RLS | |

**Risk:** Low — preferred app-layer fix.

---

### Option C — Replace function usage

Examples:

- Make `protect_portfolio_overrides_manual()` **`SECURITY DEFINER`** owned by `postgres` and inline the auth check without calling a separately permission-gated function.
- Add RPC `upsert_portfolio_override_manual(jsonb)` that sets `app.user_initiated = 'true'` then upserts (mirrors `upsert_manual_daily_portfolio_snapshot`).
- Remove trigger and enforce manual-only in application layer only.

| Pros | Cons |
|------|------|
| RPC + `user_initiated` preserves manual-data semantics | Larger change surface |
| SECURITY DEFINER trigger avoids EXECUTE grants on helper | Harder to audit; duplicates patterns |
| App-only enforcement | Weakens DB-level protection |

**Risk:** Medium — use only if A+B is insufficient.

---

## 7. Recommended safest fix (combined)

**Primary (app — Option B):**  
Route Trading Cash and Portfolio Override saves through `resolveSupabaseServerAccess()` + `getServerSupabaseClient()`, matching `persistFinancialGoalRow`.

**Secondary (SQL — minimal Option A):**  
New migration:

1. `GRANT EXECUTE ON FUNCTION public.is_authenticated_user_request() TO service_role;`
2. Extend function body so trusted server writes pass the trigger **without** opening anon:

```sql
CREATE OR REPLACE FUNCTION public.is_authenticated_user_request()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (auth.role() = 'authenticated' AND (SELECT auth.uid()) IS NOT NULL)
    OR auth.role() = 'service_role';
$$;
```

**Do not grant `EXECUTE` to `anon`.** Keep 209’s revoke of anon/PUBLIC.

**Alternative to step 2 (stricter):**  
Add `upsert_portfolio_override_manual(jsonb)` SECURITY DEFINER RPC that sets `set_config('app.user_initiated', 'true', true)` before upsert — passes via `is_user_initiated()` without widening `is_authenticated_user_request()`.

---

## 8. Implementation checklist (when approved)

- [ ] Update `saveManualTradingCash` to use `withSupabaseQuery` or `getServerSupabaseClient`
- [ ] Update `savePortfolioOverride` the same way
- [ ] Add migration `20260608140000_trading_cash_permission_fix.sql` (GRANT + function body **or** RPC)
- [ ] Verify dev save with `SUPABASE_DEV_USER_ID` + `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Verify production save with signed-in user (authenticated JWT)
- [ ] Confirm error is gone and values persist on `portfolio_overrides`
- [ ] Run `npm run build` and targeted smoke test on `portfolio_overrides` CRUD

---

## 9. Files referenced

| File | Role |
|------|------|
| `supabase/migrations/20260607220900_advisor_warning_cleanup.sql` | Function definition + GRANTs |
| `supabase/migrations/20260607220800_manual_data_protection_hardening.sql` | Trigger creation on `portfolio_overrides` |
| `app/actions/portfolio.ts` | `saveManualTradingCash`, `savePortfolioOverride` |
| `lib/supabase/server-write.ts` | `withSupabaseQuery`, `getServerSupabaseClient` |
| `lib/supabase/queries/financial-goals.ts` | Working write pattern reference |
| `components/portfolio/ManualTradingCashCard.tsx` | UI entry point |

---

**End of plan — awaiting approval before any code or database changes.**
