# Client Portfolio Ownership Schema Fix

## Problem

Saving Client Portfolio on the Portfolio Dashboard failed with:

```
Could not find the 'manual_client_portfolio_sgd' column
of 'portfolio_overrides' in the schema cache
```

Application code (Phase 17A ownership split) read and wrote `manual_client_portfolio_sgd`, but the linked Supabase database had never received the column migration.

## Root Cause

1. **Missing DB column** — `portfolio_overrides.manual_client_portfolio_sgd` did not exist on the remote database.
2. **Duplicate migration timestamps** — The original migration file `20260608170000_client_portfolio_ownership.sql` shared version `20260608170000` with `20260608170000_stock_etf_transactions_adjustments.sql`, which had already been applied remotely. Supabase records migrations by version only, so the client-portfolio migration was never executed.

## Fix Applied

### Migration

New file: `supabase/migrations/20260608200000_client_portfolio_ownership_schema_fix.sql`

```sql
ALTER TABLE public.portfolio_overrides
  ADD COLUMN IF NOT EXISTS manual_client_portfolio_sgd NUMERIC(18, 2) DEFAULT 0;

UPDATE public.portfolio_overrides
SET manual_client_portfolio_sgd = 0
WHERE manual_client_portfolio_sgd IS NULL;

ALTER TABLE public.portfolio_overrides
  ALTER COLUMN manual_client_portfolio_sgd SET DEFAULT 0;
```

Also renamed `20260608140000_portfolio_override_dev_service_role.sql` → `20260608200100_portfolio_override_dev_service_role.sql` (same duplicate-version issue with `option_price_precision`).

### Remote apply

```bash
npx supabase db push
```

Applied migrations:

- `20260608180000_sg_stocks_cash_split.sql`
- `20260608190000_closed_trade_fees_broker_pnl.sql`
- `20260608200000_client_portfolio_ownership_schema_fix.sql`
- `20260608200100_portfolio_override_dev_service_role.sql`

### Types & interfaces

| File | Change |
|------|--------|
| `types/database.ts` | `PortfolioOverride.manual_client_portfolio_sgd: number` (default 0) |
| `lib/portfolio/types.ts` | `PortfolioOverrideInput.manualClientPortfolioSgd: number` |
| `lib/portfolio/override-row.ts` | Merge default `0` instead of `null` |
| `lib/supabase/queries/portfolio.ts` | `mapOverride()` reads column with `?? 0` |
| `app/actions/portfolio.ts` | Preserve existing value with `?? 0` on upsert |
| `app/actions/crypto.ts` | Same default on crypto override merge |
| `lib/mock/portfolio.ts` | Mock default `0` |

Note: This project uses `types/database.ts` as the hand-maintained schema types file (no separate `database.types.ts`).

## Read / Write Paths

| Path | Role |
|------|------|
| **Save** | `PortfolioOwnershipSplitSection` → `saveManualClientPortfolio()` → `mergePortfolioOverrideRow()` → `portfolio_overrides` upsert |
| **Load** | `getPortfolioRaw()` → `mapOverride()` → `buildCapitalPoolsBreakdown()` → `buildPortfolioOwnershipSplit()` |
| **Display** | `PortfolioOwnershipSplitSection`, `PortfolioDashboardClient`, risk/metrics cards using `myPortfolioValue` |

## Ownership Formulas

Implemented in `lib/portfolio/ownership-split.ts`:

- **My Portfolio** = Total Portfolio − Client Portfolio
- **Client Ownership %** = Client Portfolio ÷ Total Portfolio × 100
- **My Ownership %** = My Portfolio ÷ Total Portfolio × 100

Client portfolio is capped at total portfolio; negative inputs are clamped to 0.

## Verification

### Build

```bash
npm run build
```

✅ Passed.

### Manual UI test (Portfolio Dashboard)

1. Enter **3200** in Client Portfolio
2. Click **Save**
3. Refresh page

**Expected / observed:**

| Metric | Value |
|--------|-------|
| Total Portfolio | S$44,180.71 |
| Client Portfolio | S$3,200.00 |
| My Portfolio | S$40,980.71 |
| Client Ownership % | 7.2% |
| My Ownership % | 92.8% |

Values persist after full page refresh.

## Files Touched

- `supabase/migrations/20260608200000_client_portfolio_ownership_schema_fix.sql` (new)
- `supabase/migrations/20260608200100_portfolio_override_dev_service_role.sql` (renamed from duplicate timestamp)
- `supabase/migrations/20260608170000_client_portfolio_ownership.sql` (removed — superseded)
- `supabase/migrations/20260608140000_portfolio_override_dev_service_role.sql` (removed — renamed)
- `types/database.ts`
- `lib/portfolio/types.ts`
- `lib/portfolio/override-row.ts`
- `lib/supabase/queries/portfolio.ts`
- `app/actions/portfolio.ts`
- `app/actions/crypto.ts`
- `lib/mock/portfolio.ts`
- `components/portfolio/ManualPortfolioOverrideCard.tsx`
- Test fixtures: `reconciliation.test.ts`, `manual-breakdown.test.ts`
