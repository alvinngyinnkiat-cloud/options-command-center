# Portfolio Dashboard Ownership Priority + Manual Portfolio Breakdown

## Summary

Reorganized the Portfolio Dashboard so **Portfolio Ownership Split** is the first section below the page header. Removed broker reconciliation UI and app-calculated comparison labels. **Manual Portfolio Breakdown** is now the authoritative source for component values.

## Dashboard order

1. **Portfolio Ownership Split** — Total / Client / My portfolio and ownership percentages
2. **Manual Portfolio Breakdown** — US, Crypto, SG manual inputs + Overall Portfolio Value
3. **Trading Capital & Risk** — Current state grid + trading/cash metric cards
4. **Cash Holdings** — Manual trading/crypto cash cards + cash breakdown
5. **Asset Allocation** — Chart + health score
6. **Crypto Portfolio** — Crypto holdings summary
7. **Market Income** — Dividend / income summary
8. *(Supporting)* Assets Under Management, Data Health, Latest Snapshot

Stock & ETF holdings and Financial Goals remain on their dedicated routes (`/stocks`, `/goals`).

## Removed

- Broker Portfolio Value SGD / Portfolio Value (Sections) / Difference reconciliation cards
- `App: xxx` comparison labels under manual breakdown fields
- “Use Manual Reconciliation” toggle and “Reconciliation active” header badge
- Broker reference and difference footer text on the manual breakdown card

## Retained

### Portfolio Ownership Split

- Total Portfolio — US/SG + options + Crypto Value + Trading Cash SGD
- Client Portfolio — editable manual SGD input with Save
- My Portfolio — Total − Client
- Client Ownership % / My Ownership % — auto-recalculated

### Manual Portfolio Breakdown

Display and editable fields:

- US Stocks & Options Value (USD)
- US Stocks & Options SGD Equivalent
- Crypto Value (SGD)
- SG Stocks / SG Cash Value (SGD)
- **Overall Portfolio Value (SGD)** — live preview and saved total

## Calculations

### Ownership split (unchanged)

| Metric | Formula |
|--------|---------|
| My Portfolio | Total Portfolio − Client Portfolio |
| Client Ownership % | Client Portfolio ÷ Total Portfolio × 100 |
| My Ownership % | My Portfolio ÷ Total Portfolio × 100 |

Total Portfolio continues to use section totals from `buildCapitalPoolsBreakdown` (includes Trading Cash SGD).

### Manual breakdown (source of truth)

```
Overall Portfolio Value =
  US Stocks & Options SGD Equivalent
  + Crypto Value (SGD)
  + SG Stocks / SG Cash Value (SGD)
```

Manual saves always set `use_manual_override: true`. No broker reconciliation or app comparison is required.

## Files changed

| File | Change |
|------|--------|
| `components/portfolio/PortfolioDashboardClient.tsx` | Section reorder; unified refresh handler |
| `components/portfolio/ManualPortfolioOverrideCard.tsx` | Renamed to Manual Portfolio Breakdown; removed reconciliation UI |
| `components/portfolio/CashBreakdownSection.tsx` | Removed duplicate My Portfolio Value card from summary grid |
| `components/portfolio/PortfolioCurrentStateGrid.tsx` | Removed reconciliation label |
| `app/actions/portfolio.ts` | `savePortfolioOverride` returns `capitalPools`; manual-only overall sum |

## Build

```bash
npm run build
```

Verified after this update.
