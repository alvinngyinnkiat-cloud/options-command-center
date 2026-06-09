# Portfolio Dashboard Cleanup (Final)

## Objective

Remove duplicate crypto/cash sections, simplify manual breakdown inputs, relocate snapshot creation, and align the portfolio value formula.

## Removed from Portfolio Dashboard

| Removed | Reason |
|---------|--------|
| **Crypto Portfolio** section (`CryptoPortfolioSection`) | Duplicated crypto breakdown; crypto is one line in Manual Breakdown |
| **Cash Holdings** section | `ManualCryptoCashCard` + `CashBreakdownSection` removed |
| **Daily Portfolio Snapshot** section | Snapshot moved to Ownership Split header |
| **Cash Breakdown** cards | Trading Cash SGD/USD, Crypto Cash, Total Cash stat cards |
| **SG Cash Value** input | Trading Cash SGD covers broker cash |

## Manual Portfolio Breakdown

### Crypto
- Single field: **Crypto Value (SGD)**
- Description: *Coins + stablecoins/cash*
- No separate Coin Holdings / Crypto Cash / Total Crypto cards

### Singapore
- **SG Stock Value (SGD)** only — no SG Cash Value
- **Crypto Value** and **SG Stock Value** on the same row (`Crypto & Singapore` section)

### Overall Portfolio Value formula

```
US Stocks & Options SGD Equivalent
+ Trading Cash SGD
+ Crypto Value (SGD)
+ SG Stock Value (SGD)
```

SG Cash and Crypto Cash are **not** added separately.

### Trading Capital formula

```
US SGD + Trading Cash SGD + SG Stock Value
```

Excludes crypto.

## Snapshot placement

- **Create Snapshot** button in **Portfolio Ownership Split** header (top right)
- Removed standalone Daily Portfolio Snapshot section and summary cards
- Snapshot behavior unchanged: today's Singapore date, ownership-split values, upsert per day

## Dashboard layout (after cleanup)

1. Portfolio Ownership Split (+ Create Snapshot)
2. Manual Portfolio Breakdown
3. Trading Capital & Risk (current state grid + single Trading Capital card)
4. Asset Allocation
5. Portfolio Market Income
6. Assets Under Management
7. Data Health
8. Latest Snapshot Summary (read-only reference)

## Code changes

| File | Change |
|------|--------|
| `PortfolioDashboardClient.tsx` | Removed crypto, cash, snapshot sections |
| `PortfolioOwnershipSplitSection.tsx` | Added `CreateSnapshotButton` |
| `ManualPortfolioOverrideCard.tsx` | Removed SG Cash; combined Crypto + SG row; updated formulas |
| `manual-breakdown.ts` | Excluded `sgCashValueSgd` from totals |
| `reconciliation.ts` | Portfolio total uses SG stocks only |
| `CashBreakdownSection.tsx` | Simplified `PortfolioSummarySection` |
| `PortfolioSnapshotSection.tsx` | **Deleted** |

## Verification

- No duplicate crypto sections on dashboard
- No SG Cash Value field
- No separate Daily Portfolio Snapshot section
- Create Snapshot in Portfolio Ownership Split
- Total Portfolio = US SGD + Trading Cash + Crypto Value + SG Stock Value
- Tests: `manual-breakdown.test.ts`, `reconciliation.test.ts` — pass
- `npm run build` — pass

## Notes

- Trading Cash SGD/USD remain editable in **Manual Portfolio Breakdown** only
- `ManualCryptoCashCard` component retained in codebase but not rendered on dashboard (crypto cash is part of Crypto Value field)
- Legacy `manualSgCashValueSgd` in DB is ignored in portfolio totals
