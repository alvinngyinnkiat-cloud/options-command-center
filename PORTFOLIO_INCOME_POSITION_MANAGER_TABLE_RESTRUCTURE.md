# Portfolio Income & Position Manager — Table Restructure

## Issues Fixed

1. **Total P/L card clipped** — summary grids forced 8 columns on large screens, squeezing values.
2. **US Market table horizontal scroll** — 16 wide columns including income fields.
3. **No asset-class grouping** — single flat table for all US tickers.

## Metric Card Layout

- Shared grid: `grid-cols-[repeat(auto-fill,minmax(220px,1fr))]` (`SUMMARY_METRIC_GRID` in `StatCard.tsx`)
- Cards wrap responsively; `min-w-0` on card container prevents overflow clipping
- `metric-stat-value` clamp scaling retained — full decimals, no truncation

Applied to ALL, US, SG, and Income summary cards + passive income goal card.

## Grouped Position Tables

New component: `components/ticker-positions/PositionGroupTables.tsx`

Row grouping helper: `lib/ticker-positions/group-rows.ts`

### US Market tab

| Section | Columns |
|---------|---------|
| **ETF** | Ticker, Capital Deployed, Current Value, Realized P/L, Unrealized P/L, Total P/L, ROI %, Open, Closed |
| **Stock** | Same as ETF |
| **Options** | Ticker, Realized P/L, Unrealized P/L, Total P/L, ROI %, Open, Closed |

### ALL tab

Same US sections plus **SG Holdings**:

| SG Holdings | Ticker, Capital Deployed, Current Value, Realized P/L, Unrealized P/L, Total P/L, ROI % |

### SG Market tab

Single **SG Stock / ETF** section (no Options).

## Removed from Default Views

These columns are **not** shown on ALL / US / SG position tabs:

- Premium Collected
- Dividend Income
- Annual Premium
- Annual Dividend
- Category, Income Yield %, Adjusted Cost Basis (from position tables)

They remain on the **Income** tab detailed table.

## Table Layout

- Compact tables: `w-full table-auto`, no `min-width`, no horizontal scroll wrapper
- Tighter padding (`px-2.5`) — fits laptop/fullscreen width
- Income tab: intentional horizontal scroll (`min-w-[960px]`) for detailed income columns

## P/L Colors

Unchanged — `PnlValue` / `PnlPercentValue` components:

- Profit → green
- Loss → red
- Zero → neutral

## Tabs Unchanged

ALL · US Market · SG Market · Income

## Files

| File | Change |
|------|--------|
| `components/ui/StatCard.tsx` | `SUMMARY_METRIC_GRID`, overflow fix |
| `components/ticker-positions/PositionGroupTables.tsx` | Grouped compact sections |
| `components/ticker-positions/MarketTables.tsx` | Responsive cards; income-only wide table |
| `components/ticker-positions/TickerPositionClient.tsx` | Wired grouped tables |
| `lib/ticker-positions/group-rows.ts` | ETF / Stock / Options / SG split |

## Build

```bash
npm run build
```

✅ Passed.
