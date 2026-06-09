# Stock & ETF Dividend and P/L Column Split

## Change

Unified holdings table columns (US ETF, US Stock, SG Stock):

| Column | Definition |
|--------|------------|
| Ticker | Symbol |
| Capital | Total capital deployed |
| Current Value | Current holding value |
| **Dividend** | Total dividends received for the ticker (lifetime) |
| **P/L** | Current Value − Capital |
| ROI | (Current Value + Dividend − Capital) ÷ Capital × 100 |
| Actions | Position menu |

## Removed

- **DIV P/L** column label → renamed **Dividend**
- **Unrl %** column → replaced by **P/L** (absolute, not percentage)

## Formulas

```text
P/L   = currentValue - capital
ROI   = (currentValue + dividend - capital) / capital × 100
```

Implemented in `buildStockEtfTableMetrics()` (`lib/stocks-etfs/table-rows.ts`).

## Formatting

- **Dividend**, **P/L**, **ROI**: profit green, loss red, zero neutral (`getPnLColor`)
- Money: 2 decimal places — USD (`formatTickerCurrency` / `formatSignedTickerCurrency`) for US tabs, SGD (`formatSGD` / `formatSignedSGD`) for SG Stock
- ROI: percent via `formatRoiPct` (1 decimal in display; underlying calc uses full precision)

## Files

| File | Change |
|------|--------|
| `lib/stocks-etfs/table-rows.ts` | `dividend`, `pl`, shared metrics helper |
| `components/stocks-etfs/StockEtfHoldingsTable.tsx` | Column headers and cells |
| `lib/stocks-etfs/table-rows.test.ts` | P/L and ROI assertions |

## Verification

```bash
npx vitest run lib/stocks-etfs/table-rows.test.ts
npm run build
```

Both pass.
