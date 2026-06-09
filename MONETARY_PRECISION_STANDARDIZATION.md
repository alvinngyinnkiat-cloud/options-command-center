# Monetary Precision Standardization

**Date:** 2026-06-08  
**Status:** Complete — `npm run build` passes

---

## Problem

Monetary values across the platform were rounding to whole dollars (e.g. `US$113.51` displayed as `US$113`). Options trading requires cent-level precision on all money displays.

---

## New Standard

| Rule | Example |
|------|---------|
| USD — always 2 decimals | `US$113.51` |
| SGD — always 2 decimals | `S$6,913.68` |
| Thousands separator | `US$1,550.25` |
| Zero | `US$0.00` / `S$0.00` |
| Signed P/L (positive) | `+US$61.60` |
| Signed P/L (negative) | `-US$43.40` |
| Percentages unchanged | `21.3%`, `-10.8%`, `0.0%` |

---

## Core Formatter

**Location:** `lib/format/currency.ts`

```typescript
export const MONEY_DECIMALS = 2;

/** Canonical money formatter — thousands separator, exactly 2 decimals. */
export function formatMoney(value: number, currency: "SGD" | "USD"): string;

export function formatSgd(value: number): string;   // S$6,913.68
export function formatUsd(value: number): string;  // US$113.51
```

**Signed P/L:** `lib/format/pnl.ts`

```typescript
formatPnL(113.51)                        // +US$113.51
formatPnL(-43.4)                         // -US$43.40
formatPnL(0)                             // US$0.00
formatPnL(6913.68, { currency: "SGD" }) // +S$6,913.68
```

All formatters default to `MONEY_DECIMALS` (2). No domain wrapper passes `decimals: 0` for money anymore.

---

## Domain Wrappers Updated

| Module | Used by |
|--------|---------|
| `lib/trades/format.ts` | Options Trade Tracker |
| `lib/utils.ts` (`formatSGD`, `formatCurrency`) | Portfolio, Goals, Crypto, Dividends |
| `lib/ticker-positions/format.ts` | Stock & ETF, Ticker Positions, Reports |
| `lib/journal/format.ts` | Trading Journal |
| `lib/risk/format.ts` | Risk Dashboard |
| `lib/portfolio/format-holdings.ts` | Holdings native currency (USD + SGD) |

---

## Surfaces Covered

### Options Trade Tracker
Premium Received, Current Option Value, My P/L, Realized/Unrealized P/L, Premium Collected, Open Risk, Client P/L — via `formatCurrency` / `formatSignedCurrency` / `pnlStatProps`.

### Portfolio Dashboard
Portfolio Value, Trading Capital, Cash, Market Values, P/L — via `formatSGD` / `formatSignedSGD` / `formatNativeValue`.

### Stock & ETF Tracker
Cost Basis, Market Value, Dividends, Premium Collected, Total P/L — via `formatTickerCurrency` / `formatSignedTickerCurrency`.

### Dividend Tracker
Gross/Net/SGD equivalent — via `formatSGD`; table min-width increased.

### Crypto Dashboard
Coin Value, Crypto Cash, Total Crypto Value, P/L — via `formatSGD` / `pnlStatProps`.

### Financial Goals
Current, Target, Remaining — via `formatSGD` from `lib/goals/format.ts`.

### PDF Export
All monetary cells in `lib/import-export/pdf-export.ts` now use `formatUsd` / `formatPnL` / `formatSgd`.

---

## Table Layout

Wider min-widths and `whitespace-nowrap` on money columns to prevent truncation:

| Table | Change |
|-------|--------|
| `OpenTradesTable` (detailed) | `min-w-[1720px]`, nowrap on premium/P/L columns |
| `OpenTradesTable` (summary) | Wider Opt Value / My P/L columns |
| `UsEquityHoldingsViews` (detailed) | `min-w-[1500px]` |
| `UsEquityHoldingsViews` (summary) | `whitespace-nowrap` on money cells |
| `DividendTrackerClient` | `min-w-[960px]` |

---

## What Did Not Change

- **Percentages** — still 1 decimal for P/L % and ROI (`formatPnLPercent`, `formatRoiPct`)
- **Chart axis tick labels** — abbreviated `$50k` style for readability
- **Alert message strings** — internal notification text (not dashboard display)
- **Milestone labels** — `SGD 100K` shorthand for goal thresholds
- **DPS (dividend per share)** — still 4 decimals where applicable

---

## Tests

```bash
npm test -- lib/format/currency.test.ts lib/format/pnl.test.ts
```

---

## Verification Checklist

1. Options Trade Tracker — premium `US$113.51` not `US$113`
2. Portfolio summary cards — `S$6,913.68` not `S$6,914`
3. Stock & ETF table — cost basis and P/L show cents
4. Dividend tracker — SGD equivalent shows 2 decimals
5. Crypto dashboard — holdings and cash show 2 decimals
6. Financial Goals — current/target/remaining show 2 decimals
7. Signed P/L — `+US$61.60`, `-US$43.40`, zero `US$0.00`

---

## Build

```bash
npm run build
```

Exit code: **0** (passes)
