# Metric Card Responsive Layout Standard

## Problem

After upgrading monetary values to **2 decimal places** (`US$12,543.78`, `US$105,892.44`), dashboard metric cards designed for whole-dollar widths began clipping, wrapping, or overflowing.

## Standard

### Grid layout

All dashboard metric card rows use **`MetricCardsGrid`** with a platform minimum width of **220px**:

```css
grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
```

Defined in:

| File | Purpose |
|------|---------|
| `lib/ui/metric-card-standard.ts` | `METRIC_CARD_MIN_WIDTH = 220`, `metricCardGridColumns()` |
| `components/ui/MetricCardsGrid.tsx` | Reusable grid wrapper |

Cards wrap to new rows instead of shrinking below 220px.

### Typography

All monetary values in metric cards use container-query scaling via CSS classes in `app/globals.css`:

| Class | Purpose |
|-------|---------|
| `.metric-stat-card` | `container-type: inline-size` — enables per-card scaling |
| `.metric-stat-value` | `clamp(0.9375rem, 7.5cqi, 1.5rem)` + `white-space: nowrap` + tabular nums |

**Rules:**

- No truncation (`text-overflow: ellipsis` forbidden on values)
- No hidden decimals
- No overlapping label/value text
- Change/subtitle text may wrap (`break-words`)

### StatCard

`components/ui/StatCard.tsx` applies both classes by default. Use this for all dashboard summary metrics.

For inline metric cells (e.g. daily tracker), wrap content in `.metric-stat-card` and put values in `.metric-stat-value`.

---

## Dashboards Covered

### Options Trade Tracker
- `components/trades/TradeSummaryCards.tsx`

### Client Profit Sharing Tracker
- `components/client-profit-sharing/ClientProfitSummaryCards.tsx`
- `components/client-profit-sharing/ClientLifetimeSummary.tsx`

### Portfolio Dashboard
- `components/portfolio/PortfolioMetricsGrid.tsx`
- `components/portfolio/PortfolioCurrentStateGrid.tsx`
- `components/portfolio/AssetsUnderManagementSection.tsx`
- `components/portfolio/PortfolioMarketIncomeSection.tsx`
- `components/portfolio/PortfolioPerformanceMetricsCard.tsx`
- `components/portfolio/CashBreakdownSection.tsx` (reconciliation + stat rows)
- `components/portfolio/CryptoPortfolioSection.tsx`
- `components/portfolio/OptionsPnlSummaryCards.tsx`
- `components/portfolio/PortfolioMilestonesCard.tsx`

### Financial Goals
- `components/goals/FinancialGoalsClient.tsx`
- `components/goals/GoalProgressAnalysisPanel.tsx`
- `components/goals/CAGRProjectionCards.tsx`
- `components/goals/PassiveIncomeGoalPanel.tsx`
- `components/goals/DailyPortfolioTrackerCard.tsx`
- `components/contributions/MonthlyContributionTrackerPanel.tsx`

### Dividend Tracker
- `components/dividends/DividendTrackerClient.tsx`

### Risk Dashboard
- `components/risk/RiskSummaryCards.tsx`

### Data Health Dashboard
- `components/data-health/DataHealthClient.tsx` (health report cards)

---

## Verification Values

These must display fully without clipping:

| Value | Notes |
|-------|-------|
| `US$3,000.00` | Medium amount |
| `US$12,543.78` | Typical portfolio figure |
| `US$105,892.44` | Large 6-figure value |
| `-US$43.40` | Negative P/L |
| `+US$1,550.25` | Positive signed P/L |

Achieved by 220px minimum card width + container-scaled font sizing.

---

## Usage

```tsx
import { MetricCardsGrid } from "@/components/ui/MetricCardsGrid";
import { StatCard } from "@/components/ui/StatCard";

<MetricCardsGrid>
  <StatCard label="Premium Collected" value="US$12,543.78" />
  <StatCard label="My Realized P/L" value="-US$43.40" changeType="negative" />
</MetricCardsGrid>
```

Optional props on `MetricCardsGrid`:

- `gap`: `"sm"` | `"md"` (default) | `"lg"`
- `minCardWidth`: override only when a section needs wider cards (default 220)

---

## Build

```bash
npm run build
```

Completed successfully after applying this standard.

## Related

- `RESPONSIVE_METRIC_CARD_LAYOUT_FIX.md` — initial grid migration (180px → 220px upgrade)
- `MONETARY_PRECISION_STANDARDIZATION.md` — 2-decimal currency formatting
