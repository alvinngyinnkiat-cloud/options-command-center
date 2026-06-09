# Portfolio Income & Position Manager Enhancement

## Summary

Renamed **Ticker Position Manager** → **Portfolio Income & Position Manager** and expanded the page with four tabs (ALL, US Market, SG Market, Income), tab-scoped summaries/leaderboards, a dedicated Income dashboard, and passive income goal tracking linked to Financial Goals.

## Page Rename

| Before | After |
|--------|-------|
| Ticker Position Manager | Portfolio Income & Position Manager |

Updated in:

- `components/ticker-positions/TickerPositionClient.tsx`
- `lib/constants/navigation.ts`

Route unchanged: `/ticker-positions`

## Tabs

| Tab | Default | Header |
|-----|---------|--------|
| ALL | ✓ (default) | All Markets |
| US Market | | US Market |
| SG Market | | SG Market |
| Income | | Income Dashboard |

Tab selection persists in `localStorage` key `portfolio-income-position-manager-tab` (restored on refresh).

## Tab Behavior

### ALL

- Summary cards from all US + SG tickers
- Unified table: US ETF, US Stocks, US Options, SG Stocks, SG ETFs
- Leaderboards: Top Premium Generators (US options only), Top Dividend Generators (US + SG)

### US Market

- US tickers only (ETF, Stocks, Options)
- US summary cards and `UsMarketTable`
- Both premium and dividend leaderboards

### SG Market

- SG Stocks and SG ETFs only
- SG summary cards (no Premium Collected card)
- Passive Income = dividend income only
- **Top Premium Generators hidden**
- Top Dividend Generators only

### Income

- Income-focused summary cards
- Passive income goal progress (Financial Goals)
- Income filters and income table
- All three income leaderboards

## Summary Cards

### ALL / US / SG (position tabs)

- Total Market Value
- Total Premium Collected (hidden on SG)
- Total Dividend Income
- Total Passive Income
- Avg Income Yield
- Total P/L
- Best Ticker
- Worst Ticker

Scoped to active tab tickers.

### Income tab

- Total Passive Income
- Annual Premium Income
- Annual Dividend Income
- Average Income Yield %
- Best Income Generator
- Highest Yield Position
- Monthly Passive Income Estimate
- Annual Passive Income Estimate

## Income Tab

### Filters

All Income · Dividends Only · Premium Only · Highest Yield · Highest Income · US Only · SG Only

### Table columns

Ticker, Market, Current Value, Adjusted Cost Basis, Premium Income, Dividend Income, Annual Premium, Annual Dividend, Total Passive Income, Income Yield %, Capital Gain/Loss, Total Return

### Formulas

```
Total Passive Income = Dividend Income + Premium Income (annual for summaries/yield)
Income Yield % = Total Passive Income ÷ Adjusted Cost Basis × 100
Monthly Passive Income Estimate = Annual Passive Income ÷ 12
```

### Passive Income Goal Tracking

Connected to Financial Goals (`goalType: "income"`):

- Current Monthly Passive Income (SGD, from ticker aggregates)
- Target Monthly Passive Income
- Progress %
- Remaining To Goal

Falls back to `DEFAULT_PASSIVE_INCOME_TARGET_SGD` (S$10,000/month) when no active income goal exists.

## Key Files

| File | Role |
|------|------|
| `lib/ticker-positions/tab-views.ts` | Tab filtering, unified rows, income summary, leaderboards |
| `lib/ticker-positions/market-types.ts` | New types: `AllMarketSummary`, `IncomeTabSummary`, `UnifiedMarketTickerRow`, etc. |
| `lib/ticker-positions/tab-views.test.ts` | Tab logic unit tests |
| `components/ticker-positions/MarketTables.tsx` | ALL/Income cards, unified & income tables, goal card |
| `components/ticker-positions/TickerPositionClient.tsx` | Tab UI, filters, scoped sections |
| `lib/supabase/queries/ticker-positions.ts` | Extended data payload + goal target |

## Verification Checklist

- [ ] **ALL** — SPY, VOO, QQQ, DBS, CICT visible; combined summary; premium + dividend leaderboards
- [ ] **US Market** — US tickers only; both leaderboards
- [ ] **SG Market** — DBS, CICT only; premium leaderboard hidden; dividend leaderboard visible
- [ ] **Income** — US premium + dividends; SG dividends only; goal progress updates; filters work
- [ ] Tab persists after page refresh
- [ ] `npm run build` passes

## Build

```bash
npm run build
```

✅ Passed.
