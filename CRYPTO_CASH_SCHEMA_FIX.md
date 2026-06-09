# Crypto Cash Schema Fix

**Date:** 2026-06-08

---

## Problem

Save Crypto Cash failed with:

```
Could not find the 'manual_crypto_cash_sgd' column of 'portfolio_overrides' in the schema cache
```

The app wrote `manual_crypto_cash_sgd` via `saveManualCryptoCash()`, but the remote Supabase `portfolio_overrides` table did not yet have the column.

---

## Inspection

| Item | Before fix | After fix |
|------|------------|-----------|
| `portfolio_overrides.manual_crypto_cash_sgd` | **Missing** | `NUMERIC(14,2) NOT NULL DEFAULT 0` |
| TypeScript `PortfolioOverride` | Field defined | `manual_crypto_cash_sgd: number` |
| Migration file | Existed locally, not applied | Applied via `supabase db push` |

---

## Migration

**File:** `supabase/migrations/20260608150000_manual_crypto_cash_sgd.sql`

```sql
ALTER TABLE public.portfolio_overrides
  ADD COLUMN IF NOT EXISTS manual_crypto_cash_sgd NUMERIC(14, 2);

UPDATE public.portfolio_overrides
SET manual_crypto_cash_sgd = 0
WHERE manual_crypto_cash_sgd IS NULL;

ALTER TABLE public.portfolio_overrides
  ALTER COLUMN manual_crypto_cash_sgd SET DEFAULT 0;

ALTER TABLE public.portfolio_overrides
  ALTER COLUMN manual_crypto_cash_sgd SET NOT NULL;
```

- Existing rows backfilled to **0**
- New rows default to **0** until Manual Crypto Cash is saved

---

## Apply migration

```bash
supabase db push
```

Applied successfully on 2026-06-08.

PostgREST schema cache refreshes automatically after migration apply. If a stale cache persists, restart the Supabase project or wait ~1 minute, then retry Save Crypto Cash.

---

## TypeScript updates

| File | Change |
|------|--------|
| `types/database.ts` | `manual_crypto_cash_sgd: number` (not nullable) |
| `lib/portfolio/types.ts` | `manualCryptoCashSgd: number` |
| `lib/supabase/queries/portfolio.ts` | Maps `Number(row.manual_crypto_cash_sgd ?? 0)` |
| `lib/portfolio/capital-pools.ts` | `resolveCryptoCashSgd()` uses override row value when present |
| `app/actions/portfolio.ts` | Upserts use `0` default when preserving existing row |

---

## Calculation verification

When a `portfolio_overrides` row exists:

```
Crypto Portfolio Value = Coin Holdings Total + manual_crypto_cash_sgd
```

When no override row exists, crypto cash falls back to crypto tracker stablecoin split.

```
Portfolio Value =
  US/SG Stocks & ETFs
+ Options Value
+ Trading Cash SGD
+ Crypto Portfolio Value
```

```
Trading Capital =
  US/SG Stocks & ETFs
+ Trading Cash SGD
+ Options Value
```

**Excluded from Trading Capital:** crypto holdings, crypto cash, Trading Cash USD.

---

## Manual verification checklist

1. Portfolio Dashboard → **Manual Crypto Cash**
2. Enter SGD amount → **Save Crypto Cash** (no schema error)
3. Refresh page → value persists
4. Confirm **Crypto Portfolio Value** = coin holdings + crypto cash
5. Confirm **Portfolio Value** includes crypto portfolio + trading cash SGD
6. Confirm **Trading Capital** excludes crypto cash

---

## Build

```bash
npx vitest run lib/portfolio/capital-pools.test.ts lib/portfolio/reconciliation.test.ts
npm run build
```

Both passed after migration apply.

---

## Related docs

- `CRYPTO_CASH_MANUAL_INPUT_FIX.md` — UI and save action
- `CRYPTO_CASH_AND_COIN_ARCHITECTURE_UPDATE.md` — portfolio formulas
