# Responsive Metric Card Layout Fix

## Problem

Dashboard metric cards used fixed Tailwind column counts (`grid-cols-8`, `lg:grid-cols-10`, `xl:grid-cols-4`, etc.). On wide/fullscreen viewports, cards were squeezed into too many columns, clipping currency values such as **Premium Collected**.

## Solution

Introduced a shared **`MetricCardsGrid`** component that uses CSS Grid auto-fit with a minimum card width:

```css
grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
```

Cards wrap to new rows instead of shrinking below the minimum width. **`StatCard`** was updated to avoid clipping:

- Removed `overflow-hidden` from the card wrapper
- Value text uses `whitespace-nowrap`, `tabular-nums`, and responsive sizing (`text-lg sm:text-xl xl:text-2xl`)

## Component

| File | Role |
|------|------|
| `components/ui/MetricCardsGrid.tsx` | Reusable responsive grid; `minCardWidth` (default 180px), `gap` (`sm` / `md` / `lg`) |
| `components/ui/StatCard.tsx` | Metric card with non-clipping value display |

## Dashboards Updated

### Options Trade Tracker
- `components/trades/TradeSummaryCards.tsx` — 8 summary metrics (`minCardWidth={200}`)

### Portfolio Dashboard
- `components/portfolio/PortfolioMetricsGrid.tsx` — primary + breakdown rows
- `components/portfolio/PortfolioCurrentStateGrid.tsx`
- `components/portfolio/AssetsUnderManagementSection.tsx`
- `components/portfolio/PortfolioMarketIncomeSection.tsx` — two metric rows
- `components/portfolio/PortfolioPerformanceMetricsCard.tsx`
- `components/portfolio/CashBreakdownSection.tsx` — portfolio summary stat cards

### Financial Goals
- `components/goals/FinancialGoalsClient.tsx` — portfolio breakdown stats
- `components/goals/GoalProgressAnalysisPanel.tsx` — goal progress metrics
- `components/goals/CAGRProjectionCards.tsx`
- `components/goals/PassiveIncomeGoalPanel.tsx` — passive income stat row
- `components/goals/DailyPortfolioTrackerCard.tsx` — inline metric cells

### Dividend Dashboard
- `components/dividends/DividendTrackerClient.tsx` — YTD / upcoming summary cards

### Risk Dashboard
- `components/risk/RiskSummaryCards.tsx` — 11 risk metrics (`minCardWidth={200}`)

## Responsive Behavior

| Viewport | Behavior |
|----------|----------|
| **Desktop (wide)** | Cards fill available width; each card ≥ 180–220px; values fully visible |
| **Laptop** | Fewer columns per row; cards wrap naturally |
| **Tablet / mobile** | Single column or 2-up where space allows; `min(100%, Npx)` prevents horizontal overflow |

## Verification Targets

These formatted values must remain fully visible (no ellipsis or clipping):

- `US$10,000.00`
- `US$100,000.00`
- `-US$10,000.00`

Achieved via minimum card width + `whitespace-nowrap` on values.

## Build

```bash
npm run build
```

Completed successfully after applying changes.

## Out of Scope

Form layouts, detail drawers, and non-dashboard grids (e.g. `TradeFormModal`, `OpenTradesTable` trade cards) were left unchanged — they are not top-level dashboard metric summaries.
