# Manual Portfolio Breakdown Restructure

## Summary

Consolidated all manually maintained portfolio values into the **Manual Portfolio Breakdown** section. Trading Cash fields moved up from the Cash Holdings area. Singapore values split into separate stocks and cash inputs.

## Manual Portfolio Breakdown layout

| Section | Fields |
|---------|--------|
| **US Portfolio** | US Stocks & Options (USD), US Stocks & Options SGD Equivalent |
| **Trading Cash** | Trading Cash SGD, Trading Cash USD (reference only) |
| **Crypto** | Crypto Value (SGD) |
| **Singapore** | SG Stocks Value (SGD), SG Cash Value (SGD) |
| **Total** | Overall Portfolio Value (SGD), Trading Capital (SGD) preview |

The separate **Manual Trading Cash** card was removed from the dashboard — trading cash is edited and saved via **Save Portfolio Breakdown**.

## Formulas

### Overall Portfolio Value

```
US SGD Equivalent
+ Crypto Value (SGD)
+ SG Stocks Value (SGD)
+ SG Cash Value (SGD)
+ Trading Cash SGD
= Overall Portfolio Value
```

### Trading Capital

```
US SGD Equivalent
+ Trading Cash SGD
+ SG Stocks Value (SGD)
+ SG Cash Value (SGD)
= Trading Capital
```

Excludes: Crypto Value, Crypto Cash, Trading Cash USD.

### Portfolio Ownership Split

Unchanged — still driven by `totalPortfolioSgd` from capital pools (includes all section components) minus client portfolio.

## Database

Migration `20260608180000_sg_stocks_cash_split.sql`:

- `manual_sg_stocks_value_sgd`
- `manual_sg_cash_value_sgd`

Legacy `manual_sg_stocks_cash_value_sgd` is backfilled into `manual_sg_stocks_value_sgd` and kept as combined sum on save for compatibility.

## Files changed

| File | Change |
|------|--------|
| `supabase/migrations/20260608180000_sg_stocks_cash_split.sql` | New SG split columns |
| `lib/portfolio/manual-breakdown.ts` | Overall + trading capital formulas |
| `lib/portfolio/manual-breakdown.test.ts` | Unit tests |
| `lib/portfolio/reconciliation.ts` | Manual section totals + trading capital |
| `lib/portfolio/capital-pools.ts` | Manual trading capital override |
| `lib/portfolio/calculations.ts` | Manual display values |
| `lib/portfolio/types.ts` | `manualSgStocksValueSgd`, `manualSgCashValueSgd` |
| `types/database.ts` | DB types |
| `lib/portfolio/override-row.ts` | Merge helper |
| `lib/supabase/queries/portfolio.ts` | Map override |
| `app/actions/portfolio.ts` | Save new fields |
| `components/portfolio/ManualPortfolioOverrideCard.tsx` | Unified grouped UI |
| `components/portfolio/PortfolioDashboardClient.tsx` | Removed ManualTradingCashCard |
| `lib/portfolio/reconciliation.test.ts` | Updated expectations |

## Build

```bash
npm run build
```

Verified after this update.
