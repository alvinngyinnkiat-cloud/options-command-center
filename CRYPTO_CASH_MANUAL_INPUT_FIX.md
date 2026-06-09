# Crypto Cash Manual Input Fix

**Date:** 2026-06-08

---

## Problem

Crypto Cash displayed as **S$0** on the Portfolio Dashboard with no way to enter stablecoin / exchange cash manually. Trading Cash had a dedicated input card; Crypto Cash did not.

---

## Solution

Added **Manual Crypto Cash** — same pattern as Manual Trading Cash:

- Input field: **Crypto Cash (SGD)**
- Button: **Save Crypto Cash**
- Persists to `portfolio_overrides.manual_crypto_cash_sgd` in Supabase

---

## Architecture rules (unchanged, now enforced with manual input)

| Bucket | Portfolio Value | Crypto Portfolio Value | Trading Capital |
|--------|-----------------|------------------------|-----------------|
| Coin Holdings | via Crypto Portfolio Value | ✅ | ❌ |
| **Crypto Cash** | ✅ | ✅ | ❌ |
| Trading Cash SGD | ✅ | ❌ | ✅ |
| Trading Cash USD | ❌ reference only | ❌ | ❌ |

### Formulas

```
Crypto Portfolio Value = Coin Holdings Total + Crypto Cash

Portfolio Value =
  US/SG Stocks & ETFs + Options + Trading Cash SGD + Crypto Portfolio Value

Trading Capital =
  US/SG Stocks & ETFs + Trading Cash SGD + Options
```

Manual override priority for crypto cash:

1. `portfolioOverride.manualCryptoCashSgd` (saved manual value)
2. Crypto tracker stablecoin split (`USDT`, `USDC`, etc.)

Coin holdings remain separate (`manualCryptoValueSgd` in reconciliation = holdings only).

---

## Database

Migration: `supabase/migrations/20260608150000_manual_crypto_cash_sgd.sql`

```sql
ALTER TABLE public.portfolio_overrides
  ADD COLUMN IF NOT EXISTS manual_crypto_cash_sgd NUMERIC(14, 2);
```

Apply with:

```bash
supabase db push
```

---

## Code changes

| File | Change |
|------|--------|
| `supabase/migrations/20260608150000_manual_crypto_cash_sgd.sql` | **New** column |
| `types/database.ts` | `manual_crypto_cash_sgd` on `PortfolioOverride` |
| `lib/portfolio/types.ts` | `manualCryptoCashSgd` on `PortfolioOverrideInput` |
| `lib/supabase/queries/portfolio.ts` | Map override field |
| `lib/portfolio/capital-pools.ts` | `resolveCryptoCashSgd()` |
| `lib/portfolio/reconciliation.ts` | Manual crypto cash in section total |
| `app/actions/portfolio.ts` | `saveManualCryptoCash()` server action |
| `components/portfolio/ManualCryptoCashCard.tsx` | **New** input card |
| `components/portfolio/PortfolioDashboardClient.tsx` | Renders card + refresh handler |
| `components/portfolio/CashBreakdownSection.tsx` | Clearer crypto cash labels |
| `components/portfolio/CryptoPortfolioSection.tsx` | Points to manual input |
| `lib/portfolio/capital-pools.test.ts` | Manual override test |

---

## Dashboard UX

1. **Manual Crypto Cash** card — below Manual Trading Cash
2. **Cash Breakdown → Crypto Cash** — shows saved value; notes manual edit path
3. **Crypto Portfolio** section — Coin Holdings + Crypto Cash = Total Crypto Portfolio Value

After save, `revalidatePath("/")` refreshes metrics and capital pools. Value persists across page reload via Supabase.

---

## Verification

```bash
npx vitest run lib/portfolio/capital-pools.test.ts
npm run build
```

Manual test:

1. Open Portfolio Dashboard
2. Enter Crypto Cash SGD amount → **Save Crypto Cash**
3. Confirm Crypto Cash card, Crypto Portfolio, and Portfolio Value update
4. Refresh page — value persists
