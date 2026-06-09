# Phase 16G.3 — Post-Migration Verification

**Date:** 2026-06-08  
**Project:** `gmavxpygdpatfmpusoms` (options-command-center)  
**Status:** Migration applied and verified

---

## 1. Migrations applied

Command: `npx supabase db push`

| Migration | Applied to remote |
|-----------|-------------------|
| `20260608130000_daily_portfolio_snapshots_rls_fix.sql` | ✅ (pending dependency, applied in same push) |
| `20260608140000_portfolio_override_dev_service_role.sql` | ✅ **Phase 16G.3 target** |

Remote/local sync confirmed via `supabase migration list` — both show on local and remote columns.

---

## 2. Database changes (08140000 only)

```sql
GRANT EXECUTE ON FUNCTION public.is_authenticated_user_request() TO service_role;

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

### Security requirements checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Minimum permissions | ✅ | Single `GRANT EXECUTE` on one function to `service_role` only |
| Production RLS unchanged | ✅ | No RLS policy changes in 08140000 |
| No anon grants | ✅ | `anon` / `PUBLIC` remain revoked (migration 209) |
| Service role dev-only (operational) | ✅ | App uses `createAdminClient()` only when `NODE_ENV=development` + `SUPABASE_DEV_USER_ID` + `SUPABASE_SERVICE_ROLE_KEY`; key is server-only (`lib/supabase/admin.ts`) |
| Authenticated production behavior | ✅ | Function still returns `true` for `authenticated` + non-null `auth.uid()` |

**Note:** The DB grant to `service_role` exists at the PostgreSQL role level. **Dev-only enforcement is application-layer** — production deployments must not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser and should use authenticated sessions for user writes.

---

## 3. Build verification

```bash
npm run build
```

**Result:** ✅ Passed (exit code 0)

> Build must run without `NODE_ENV=development` set in the shell (Next.js prerender requires standard production env).

---

## 4. Write-path verification (dev service-role)

Script: `scripts/verify-16g3-portfolio-overrides.mjs`

```bash
NODE_ENV=development node --env-file=.env.local scripts/verify-16g3-portfolio-overrides.mjs
```

**Dev user:** `da788735-0cdd-4045-9ef2-e40a681f32c9`  
**Verification tag:** `16G3-1780885228428`

### Results

| Test | HTTP | Persist after refresh | Pass |
|------|------|---------------------|------|
| **Save Trading Cash** (`manual_trading_cash_usd`, `manual_trading_cash_sgd`) | 201 | USD 1234.56, SGD 6914.90 | ✅ |
| **Save Reconciliation Notes** (`override_reason`) | 200 | Note text matches | ✅ |
| **Save Portfolio Override** (`use_manual_override`, bucket fields, `manual_total_portfolio_value_sgd`) | 200 | Total 36483.08, override on | ✅ |
| **Trading Cash retained** after override save | — | SGD 6914.90 unchanged | ✅ |

**Overall:** `"ok": true` — all 9 assertion steps passed.

Each save was followed by a fresh `GET portfolio_overrides?user_id=eq.<SUPABASE_DEV_USER_ID>` to simulate page refresh / re-read.

### Errors eliminated

| Before | After |
|--------|-------|
| `permission denied for function is_authenticated_user_request` (anon) | Gone |
| `portfolio_overrides is manual only — blocked for automated/system requests` (service_role pre-08140000) | Gone |

---

## 5. Application write path (unchanged, confirmed compatible)

| Action | Server function | Client resolution |
|--------|-----------------|-------------------|
| Save Trading Cash | `saveManualTradingCash` | `getPortfolioOverrideWriteContext()` |
| Save Portfolio Override | `savePortfolioOverride` | `getPortfolioOverrideWriteContext()` |
| Reconciliation Notes | Part of `savePortfolioOverride` (`override_reason`) | Same |

Dev mode: `resolveSupabaseServerAccess()` → `dev-service-role` → `createAdminClient()`  
Production: `production-session` → `createClient()` with auth cookies

---

## 6. Files touched in Phase 16G.3

| File | Role |
|------|------|
| `supabase/migrations/20260608140000_portfolio_override_dev_service_role.sql` | DB fix (applied) |
| `app/actions/portfolio.ts` | Server write routing (prior commit) |
| `scripts/verify-16g3-portfolio-overrides.mjs` | Post-migration verification script |

---

## 7. Operator follow-up

1. Restart dev server if running (`npm run dev`) so server actions pick up DB state.
2. In UI, confirm Trading Cash card save on dashboard (`/`).
3. Confirm Manual Reconciliation card save (notes + override toggle).
4. Hard refresh browser and verify values persist.

---

**Phase 16G.3 complete — stop and wait.**
