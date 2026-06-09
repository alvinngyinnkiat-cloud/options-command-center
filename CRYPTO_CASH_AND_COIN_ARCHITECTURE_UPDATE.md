# Crypto Cash and Coin Architecture Update

**Date:** 2026-06-08

---

## Core rule

```
Crypto Portfolio Value = Coin Holdings Total + Crypto Cash
```

Coin holdings and crypto cash remain **separate tracked buckets**. The combined total is the single crypto line in overall Portfolio Value.

---

## Formulas

### Crypto Portfolio Value

```
Crypto Portfolio Value =
  Coin Holdings Total   (BTC, ETH, SOL, etc. — excludes stablecoins)
+ Crypto Cash           (USDT, USDC, exchange stablecoin cash)
```

Implementation: `buildCryptoPortfolioValueSgd()` in `lib/portfolio/cash-architecture.ts`

Split source: `splitCryptoTrackerValues()` in `lib/portfolio/capital-pools.ts`

### Portfolio Value

```
Portfolio Value =
  US Stocks/ETFs (SGD)
+ SG Stocks/ETFs (SGD)
+ Options Current Value (SGD)
+ Trading Cash SGD
+ Crypto Portfolio Value
```

Implementation: `buildPortfolioValueSgd()` — adds `buildCryptoPortfolioValueSgd(holdings, cash)` as one component.

Manual override: `manualCryptoValueSgd` = **coin holdings only**; crypto cash always from tracker split.

### Trading Capital

```
Trading Capital =
  US Stocks/ETFs (SGD)
+ SG Stocks/ETFs (SGD)
+ Trading Cash SGD
+ Options Current Value (SGD)
```

**Excluded:** Coin Holdings Total, Crypto Cash, Crypto Portfolio Value, Trading Cash USD.

Implementation: `buildTradingCapitalSgd()` in `lib/portfolio/cash-architecture.ts`

### Risk capacity (unchanged)

```
maximumOptionsCapital = Trading Capital × 75%
availableRiskCapacity = maximumOptionsCapital − currentOpenRisk
```

---

## Data model

| Field | Meaning | In Portfolio Value | In Trading Capital |
|-------|---------|-------------------|-------------------|
| `cryptoHoldingsSgd` | Coin Holdings Total | via Crypto Portfolio Value | ❌ |
| `cryptoCashSgd` | Crypto Cash | via Crypto Portfolio Value | ❌ |
| `cryptoPortfolioValueSgd` | Coin holdings + crypto cash | ✅ (as one line) | ❌ |
| `cryptoCapital` | Deprecated alias of `cryptoPortfolioValueSgd` | ✅ | ❌ |
| `tradingCashSgd` | Broker SGD cash | ✅ | ✅ |
| `brokerUsdCashNative` | Trading Cash USD | ❌ reference only | ❌ |

---

## Dashboard display

New section: `CryptoPortfolioSection` shows:

1. **Coin Holdings Total** — individual coin/token values
2. **Crypto Cash** — stablecoin / exchange cash
3. **Total Crypto Portfolio Value** — sum of the above

Also updated:

- `PortfolioSummarySection` — “Total Crypto Portfolio Value” stat card
- `PortfolioMarketIncomeSection` — three crypto stat cards + revised portfolio value subtitle
- `PortfolioCurrentStateGrid` — Trading + Crypto Portfolio Value breakdown
- `CashBreakdownSection` — portfolio value copy references Crypto Portfolio Value

---

## Snapshots

Daily snapshots store components separately (no schema change):

- `crypto_value_sgd` → coin holdings total
- `crypto_cash_sgd` → crypto cash
- `portfolio_value_sgd` → full section total including both via `capitalPools.myPortfolioValue`

Together, `crypto_value_sgd + crypto_cash_sgd` equals Crypto Portfolio Value at snapshot time.

---

## Goals

Financial goals use `capitalPools.myPortfolioValue`, which already includes Crypto Portfolio Value through `buildPortfolioValueSgd()`. No goal formula change required.

---

## Code changes

| File | Change |
|------|--------|
| `lib/portfolio/cash-architecture.ts` | Added `buildCryptoPortfolioValueSgd()`; `buildPortfolioValueSgd()` uses it |
| `lib/portfolio/capital-pools.ts` | Exposes `cryptoPortfolioValueSgd`; `cryptoCapital` kept as alias |
| `lib/portfolio/crypto-integration.ts` | `getCryptoPortfolioValueSgd()` uses split + `buildCryptoPortfolioValueSgd` |
| `lib/portfolio/enrich-capital-pools.ts` | Maps `cryptoPortfolioValueSgd` to metrics |
| `lib/portfolio/types.ts` | Added `cryptoPortfolioValueSgd` on `PortfolioMetrics` |
| `components/portfolio/CryptoPortfolioSection.tsx` | **New** — three crypto portfolio cards |
| `components/portfolio/PortfolioDashboardClient.tsx` | Renders `CryptoPortfolioSection` |
| `components/portfolio/CashBreakdownSection.tsx` | Updated labels and copy |
| `components/portfolio/PortfolioMarketIncomeSection.tsx` | Coin / cash / total crypto cards |
| `components/portfolio/PortfolioCurrentStateGrid.tsx` | Uses `cryptoPortfolioValueSgd` |
| `lib/portfolio/cash-architecture.test.ts` | Test for `buildCryptoPortfolioValueSgd` |
| `lib/portfolio/capital-pools.test.ts` | Asserts `cryptoPortfolioValueSgd` |

---

## Verification

```bash
npm test -- lib/portfolio/cash-architecture.test.ts lib/portfolio/capital-pools.test.ts lib/portfolio/reconciliation.test.ts
npm run build
```

---

## Relation to prior doc

This update builds on `CRYPTO_CASH_ARCHITECTURE_UPDATE.md` (three cash buckets). That doc introduced separate Crypto Cash tracking; this doc formalizes **Crypto Portfolio Value** as the combined crypto line in Portfolio Value while keeping coin holdings and crypto cash as distinct inputs.
