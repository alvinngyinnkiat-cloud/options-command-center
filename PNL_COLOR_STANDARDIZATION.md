# P/L Color Standardization

**Date:** 2026-06-08  
**Status:** Complete — `npm run build` passes

---

## Summary

All trading dashboard metric cards and P/L displays now use a shared color and formatting standard:

| Sign | Color | Tailwind class |
|------|-------|----------------|
| Positive | Green | `text-profit` |
| Negative | Red | `text-loss` |
| Zero | Neutral | `text-terminal-muted` |

---

## Core Helpers

**Location:** `lib/format/pnl.ts`

### `getPnLColor(value: number)`

Returns the Tailwind class for a numeric P/L or return value:

```typescript
getPnLColor(43)   // "text-profit"
getPnLColor(-43)  // "text-loss"
getPnLColor(0)    // "text-terminal-muted"
```

Also exported: `getPnLChangeType(value)` → `"positive" | "negative" | "neutral"` for `StatCard` `changeType`.

### `formatPnL(value, options?)`

Signed currency formatter (zero has no sign):

```typescript
formatPnL(43)                              // "+US$43"
formatPnL(-43)                             // "-US$43"
formatPnL(0)                               // "US$0"
formatPnL(101, { currency: "SGD" })        // "+S$101"
formatPnL(-1550, { currency: "USD" })      // "-US$1,550"
```

Options: `{ currency?: "USD" | "SGD", decimals?: number }`

### `formatPnLPercent(value, decimals?)`

Signed percent formatter:

```typescript
formatPnLPercent(5.2)   // "+5.2%"
formatPnLPercent(-3.1)  // "-3.1%"
formatPnLPercent(0)     // "0.0%"
```

### Convenience helpers

- `pnlStatProps(value, options?)` — `{ value, valueClassName, changeType }` for summary cards
- `pnlPercentStatProps(value, decimals?)` — same for percentage metrics

---

## UI Components

### `StatCard` (`components/ui/StatCard.tsx`)

Added optional `valueClassName` so metric **values** (not just change subtitles) can be color-coded.

### `PnlValue` / `PnlPercentValue` (`components/ui/PnlValue.tsx`)

Reusable table/cell components wrapping `formatPnL` / `formatPnLPercent` + `getPnLColor`.

```tsx
<PnlValue value={trade.pnl} />
<PnlValue value={holding.profitLossSgd} currency="SGD" />
<PnlPercentValue value={holding.returnPct} />
```

---

## Delegated Formatters

Existing formatters now delegate to `formatPnL` for consistency:

| Module | Function |
|--------|----------|
| `lib/trades/format.ts` | `formatSignedCurrency`, `formatPercent` |
| `lib/utils.ts` | `formatSignedSGD`, `formatSignedCurrency` |
| `lib/journal/format.ts` | `formatSignedCurrency` |
| `lib/ticker-positions/format.ts` | `formatSignedTickerCurrency`, `formatRoiPct` |

---

## Areas Updated

### Summary cards (via `pnlStatProps` + `valueClassName`)

- Options Trade Tracker — My Unrealized/Realized P/L, Client P/L Owed, Premium Collected
- Portfolio — Net P/L, Return %, Monthly Gain/Loss, Daily Change
- Risk Dashboard — My Open P/L, Available Risk Capacity
- Client Profit Sharing — Client P/L, Return %, My Share, Outstanding
- Journal — My Net P/L, Avg Win/Loss
- Crypto — P/L SGD, Return %
- Stocks/ETFs — Total P/L, Return %, Best/Worst performer
- Ticker Positions — US/SG market total P/L
- US Equity tabs — Total P/L, Net Position P/L
- Options P/L (portfolio) — My Open Options P/L, Client P/L Owed
- Assets Under Management — Client P/L, Client Return %

### Tables & inline displays (via `PnlValue` / `getPnLColor`)

- Options trade table — P/L, P/L % columns
- Crypto / Stock/ETF holdings tables
- US/SG equity holdings views
- Ticker position market tables — Realized, Unrealized, Total P/L, ROI %
- Risk tables — strategy and ticker exposure P/L
- Trade queue — active ticker exposure P/L
- Portfolio open positions summary
- Expected return panel — Unrealized P/L
- Edit current value modal — P/L preview

---

## Rules Applied

1. **Positive** → green (`text-profit`), prefixed `+` for signed currency/percent
2. **Negative** → red (`text-loss`), prefixed `-`
3. **Zero** → neutral (`text-terminal-muted`), no `+` prefix — e.g. `US$0`, `0.0%`
4. **Win Rate** and other non-signed metrics remain neutral on the primary value
5. **Premium Collected** uses P/L coloring when value can be negative

---

## Usage Pattern for New Metrics

```tsx
import { pnlStatProps } from "@/lib/format/pnl";
import { StatCard } from "@/components/ui/StatCard";

const pnl = pnlStatProps(summary.myCurrentPnl);

<StatCard
  label="My Unrealized P/L"
  value={pnl.value}
  valueClassName={pnl.valueClassName}
  changeType={pnl.changeType}
/>
```

For table cells:

```tsx
import { PnlValue } from "@/components/ui/PnlValue";

<td><PnlValue value={row.totalPnl} currency="SGD" /></td>
```

---

## Tests

- `lib/format/pnl.test.ts` — color mapping, USD/SGD formatting, zero handling

---

## Build

`npm run build` — passes
