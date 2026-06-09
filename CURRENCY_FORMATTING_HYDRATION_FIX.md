# Currency Formatting Hydration Fix

**Date:** 2026-06-08

---

## Problem

React hydration failed on the Portfolio Dashboard:

| Environment | Trading Cash USD display |
|-------------|-------------------------|
| Server (Node) | `US$5,358.54` |
| Client (browser) | `$5,358.54` |

**Root cause:** `CashBreakdownSection` used `Number.prototype.toLocaleString(undefined, { style: "currency", currency: "USD" })`. With `undefined` locale, Node (often `en-SG`) and the browser (often `en-US`) produce different currency symbols.

Secondary issues:

- `formatCurrency()` in `lib/utils.ts` routed SGD portfolio values through `formatUsd()` with a bare `$` prefix
- `formatSgd()` incorrectly delegated to `formatUsd()` instead of using `S$`
- Several modules used `Intl.NumberFormat("en-US", …)` — deterministic per locale but inconsistent with required `US$` / `S$` display rules

---

## Solution

### Single source of truth: `lib/format/currency.ts`

Deterministic formatting — **no** `Intl.NumberFormat`, **no** locale-dependent `toLocaleString`:

| Function | Output example |
|----------|----------------|
| `formatSgd(value, decimals?)` | `S$1,234.56` (default 0 decimals) |
| `formatUsd(value, decimals?)` | `US$1,234.56` (default 2 decimals) |
| `formatCurrencyAmount(value, "SGD" \| "USD", decimals?)` | Explicit prefix + grouping |
| `formatSignedSgd` / `formatSignedUsd` | Signed variants |

Implementation uses manual thousand-separator grouping (`1,234.56`) so server and client always match.

`lib/format/numbers.ts` re-exports from `currency.ts` for backward compatibility.

---

## Files updated

| File | Change |
|------|--------|
| `lib/format/currency.ts` | **New** — canonical deterministic formatters |
| `lib/format/currency.test.ts` | **New** — unit tests |
| `lib/format/numbers.ts` | Re-exports from `currency.ts` |
| `lib/utils.ts` | `formatCurrency` → `formatSgd`; exports `formatUsd` |
| `lib/portfolio/format-holdings.ts` | `formatNativeValue` uses `formatCurrencyAmount` |
| `components/portfolio/CashBreakdownSection.tsx` | Replaced `toLocaleString` with `formatUsd` |
| `components/portfolio/PortfolioDashboardClient.tsx` | Replaced `openRisk.toLocaleString()` with `formatNumber` |
| `components/goals/PortfolioGrowthHistorySection.tsx` | Replaced `toLocaleString` with `formatSGD` |
| `lib/portfolio/snapshot-history.ts` | Milestone amounts use `formatNumber` |
| `lib/ticker-positions/format.ts` | Uses `formatUsd` |
| `lib/trades/format.ts` | Uses `formatUsd` |
| `lib/risk/format.ts` | Uses `formatUsd` |
| `lib/journal/format.ts` | Uses `formatUsd` |

### Sections covered

- **Portfolio dashboard** — Cash Breakdown, Summary, Market & Income, Crypto Portfolio, Snapshots
- **Goals** — milestone tracker, growth history, progress panels (via `formatSGD` / `formatCurrency`)
- **Crypto** — `formatSGD` now renders `S$` prefix consistently

---

## Required display rules (enforced)

```
SGD:  S$1,234.56
USD:  US$1,234.56
```

Crypto cash SGD equivalent uses `formatSGD` → `S$…`

---

## Verification

```bash
npx vitest run lib/format/currency.test.ts
npm run build
npm run dev
```

Browser check (Portfolio Dashboard):

- Trading Cash USD card: **US$5,358.54** (server and client)
- Trading Cash SGD: **S$6,914**
- Latest Snapshot Summary: **S$1,000** (not bare `$`)
- Goals page milestones: **S$44,242**, target line **S$100,000**

No hydration mismatch observed after fix.

---

## Guidelines for new code

1. Import from `@/lib/format/currency` (or `@/lib/utils` for `formatSGD` / `formatUsd`)
2. Never use `toLocaleString(undefined, …)` or `Intl.NumberFormat` for displayed currency
3. Use `formatSgd` for SGD portfolio values; `formatUsd` for USD reference amounts
4. Use `formatNativeValue(currency)` when formatting holdings in native currency
