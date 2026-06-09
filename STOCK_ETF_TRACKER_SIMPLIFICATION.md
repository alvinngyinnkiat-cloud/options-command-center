# Stock & ETF Tracker Simplification

## Objective

Stock & ETF Tracker tracks **actual stock and ETF holdings only**. Options income and performance belong in Options Trade Tracker and Portfolio Income & Position Manager.

## Removed from Stock & ETF Tracker

### Table columns (all tabs)
- Premium Collected
- Annual Premium
- Open / Closed options counts
- Options-inclusive total P/L columns in default view

### Summary cards (US ETF / US Stock)
- Total Premium Collected
- Options-adjusted cost basis / net position cards

### UI modes
- Summary / Detailed / Cards toggle removed — single compact table for all tabs

## Unified table (US ETF, US Stock, SG Stock)

| Column | Meaning |
|--------|---------|
| Ticker | Symbol |
| Capital | Total capital deployed (`totalInvestedNative`) |
| Current Value | Current holding value (shares/ETF only — no LEAPS) |
| DIV P/L | Lifetime net dividend income from Dividend Tracker |
| Unrl % | Unrealized return % on capital deployed |
| ROI | Total return % including dividends (stock/ETF only) |
| Actions | Dropdown: Add Buy, Add Sell, Edit Position, View Transactions, View Adjustment History |

## Summary cards (all tabs)

- Total Market Value
- Total Capital
- Total Dividend Income
- Total P/L (stock + dividends only)
- Total ROI

## Data changes

- **`buildUsEquityTabData`** — rows require a holding record; trade-only tickers excluded
- **`UsEquityTabSummary`** — stock-focused totals; `totalPremiumCollected` retained internally for portfolio category metrics only
- **`SgStockTabSummary`** — aligned fields; dividend total uses lifetime income
- **`lib/stocks-etfs/table-rows.ts`** — maps holdings to unified table rows with stock-only ROI math

## Where options metrics remain

| Location | Content |
|----------|---------|
| **Options Trade Tracker** (`/trades`) | Individual trades, premium, P/L, open/closed |
| **Portfolio Income & Position Manager** (`/ticker-positions`) | Combined ticker performance, premium + dividend + total P/L |

## Files changed

| Action | Path |
|--------|------|
| Added | `components/stocks-etfs/StockEtfHoldingsTable.tsx` |
| Added | `components/stocks-etfs/StockEtfPositionActionsMenu.tsx` |
| Added | `lib/stocks-etfs/table-rows.ts` |
| Added | `lib/stocks-etfs/table-rows.test.ts` |
| Updated | `components/stocks-etfs/StockEtfTrackerClient.tsx` |
| Updated | `components/stocks-etfs/UsEquityHoldingsViews.tsx` |
| Updated | `components/stocks-etfs/UsEquitySummaryCards.tsx` |
| Updated | `components/stocks-etfs/SgStockTabPanel.tsx` |
| Updated | `lib/stocks-etfs/us-equity-positions.ts` |
| Updated | `lib/stocks-etfs/build-tab-data.ts` |
| Updated | `lib/stocks-etfs/types.ts` |
| Deleted | `components/stocks-etfs/SgStockHoldingsViews.tsx` |

## Layout

- `table-fixed` with column widths — no horizontal scroll on standard viewports
- Actions grouped in dropdown menu
- Money: 2 decimal places (USD via `formatTickerCurrency`, SGD via `formatSGD`)
- P/L coloring: green profit, red loss, neutral zero

## Verification

- US ETF / US Stock / SG Stock tabs show holdings-only columns
- No premium or options count columns
- Portfolio Income & Position Manager unchanged (combined performance)
- Options Trade Tracker unchanged

## Build

```bash
npx vitest run lib/stocks-etfs/table-rows.test.ts
npm run build
```

Both pass.
