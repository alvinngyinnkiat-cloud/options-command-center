# Options Liquidity USD Cash Fix

## Problem

Liquidity and Stress Test on the Risk Dashboard used **Trading Cash SGD** for options close coverage and stress scenarios. USD options require **Trading Cash USD** — open risk and close requirements are in USD and must not be compared against SGD broker cash.

## Requirement

- **Trading Cash USD** — options liquidity, close coverage, stress test
- **Trading Cash SGD** — portfolio value, dashboard totals (unchanged)
- No automatic SGD → USD conversion

## Formulas (USD)

| Metric | Formula |
|--------|---------|
| Emergency Buffer | Trading Cash USD − Current Close Requirement |
| After New Trade Buffer | Trading Cash USD − Close Requirement − New Trade Risk |
| Remaining After New Trade | Trading Cash USD − Current Open Risk − New Trade Risk |
| Can Close All Positions | Trading Cash USD ≥ Current Close Requirement |
| Liquidity Ratio | Trading Cash USD ÷ Close Requirement |
| Stress Test — Trading Cash USD Available | Trading Cash USD |
| Stress Test — Remaining After Worst Case | Trading Cash USD − Close Requirement − Worst Case Open Risk |

## Code Changes

### `lib/risk/capital-liquidity.ts`

- `CashBalances.cashAvailable` now holds **Trading Cash USD** (was SGD).
- `extractCashBalances()` and `buildCapitalLiquidityBase()` set `cashAvailable = cashUsdNative`.
- `buildCapitalLiquidityCheck()` uses `tradingCashUsd` for all liquidity and stress-test math.
- `remainingCapitalAfterNewTrade` switched from stock deployable capital to USD cash:  
  `cashUsdNative − currentOpenRisk − newTradeRisk`.

### `components/risk/CapitalLiquidityCheck.tsx`

- Liquidity fields show USD via `formatRiskCurrency` (unchanged formatter; source is now USD cash).
- Added formula hints on Emergency Buffer, After New Trade Buffer, Remaining After New Trade.
- Stress Test label: **Cash Available** → **Trading Cash USD Available** (`formatNativeValue` USD).

### Unchanged

- Trading Cash section still shows SGD and USD broker balances separately.
- `stockDeployableCapital` remains US Stocks & Options Value − Open Risk (USD capital reference).
- Portfolio dashboard and SGD portfolio totals unchanged.

## Tests

- `lib/risk/capital-liquidity.test.ts` — USD cash expectations
- `lib/trading-workflow/readiness.test.ts` — mock `cashAvailable` aligned to USD

## Verification

```bash
npm run build
```

Manual: Risk Dashboard → Capital & Liquidity Check — confirm Liquidity and Stress Test values track **USD Cash (Broker)**, not SGD Trading Cash.
