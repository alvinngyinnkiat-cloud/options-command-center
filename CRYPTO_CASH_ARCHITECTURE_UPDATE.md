# Crypto Cash Architecture Update

**Date:** 2026-06-08

---

## Three cash buckets

| Bucket | Source | Portfolio Value | Trading Capital | Risk (75% cap) |
|--------|--------|-----------------|-----------------|----------------|
| **Trading Cash SGD** | `portfolio_overrides.manual_trading_cash_sgd` or broker SGD cash holdings | ✅ | ✅ | ✅ (base) |
| **Trading Cash USD** | `portfolio_overrides.manual_trading_cash_usd` | ❌ reference only | ❌ | ❌ |
| **Crypto Cash** | Crypto tracker (USDT/USDC/stablecoins) | ✅ | ❌ | ❌ |

Crypto **holdings** (non-cash assets) are in Portfolio Value via `cryptoHoldingsSgd` and in `cryptoCapital`, but excluded from Trading Capital.

---

## Formulas

### Portfolio Value

```
Portfolio Value =
  US Stock/ETF Value
+ SG Stock/ETF Value
+ Options Current Value
+ Crypto Holdings
+ Trading Cash SGD
+ Crypto Cash
```

Implementation: `buildPortfolioValueSgd()` in `lib/portfolio/cash-architecture.ts`

Manual reconciliation: `manualCryptoValueSgd` = **holdings only**; Crypto Cash always from crypto tracker split.

### Trading Capital

```
Trading Capital =
  US Stock/ETF Value
+ SG Stock/ETF Value
+ Trading Cash SGD
+ Options Current Value   (risk framework — PROJECT_RULES)
```

Excludes: Crypto Holdings, Crypto Cash, Trading Cash USD.

Implementation: `buildTradingCapitalSgd()` in `lib/portfolio/cash-architecture.ts`

### Risk capacity (unchanged)

```
maximumOptionsCapital = Trading Capital × 75%
availableRiskCapacity = maximumOptionsCapital − currentOpenRisk
```

Used in `PortfolioDashboard`, `buildRiskDashboardData`, `buildRiskFramework`.

### Total cash (net worth display)

```
totalCashSgd = Trading Cash SGD + Crypto Cash
```

USD reference is never included.

---

## Code changes

| File | Change |
|------|--------|
| `lib/portfolio/cash-architecture.ts` | **New** — canonical portfolio / trading-capital / total-cash formulas |
| `lib/portfolio/cash-architecture.test.ts` | **New** — unit tests |
| `lib/portfolio/reconciliation.ts` | Uses `buildPortfolioValueSgd`; manual crypto = holdings only + separate crypto cash |
| `lib/portfolio/capital-pools.ts` | Uses `buildTradingCapitalSgd`, `buildTotalCashSgd` |
| `components/portfolio/CashBreakdownSection.tsx` | Four cards: Trading Cash SGD, Trading Cash USD, Crypto Cash, Total Cash; summary stat cards |
| `components/portfolio/ManualTradingCashCard.tsx` | Updated copy |
| `components/portfolio/ManualPortfolioOverrideCard.tsx` | Crypto field = holdings only |

---

## Downstream consumers (verified)

| Area | Behavior |
|------|----------|
| **Dashboard** | `myPortfolioValue`, `tradingCapital`, three cash stat cards |
| **Goals** | `capitalPools.myPortfolioValue` via `financial-goals.ts` / `goals.ts` |
| **Snapshots** | `buildDailySnapshotPayload` stores `sgd_cash`, `usd_cash`, `crypto_cash_sgd`, `crypto_value_sgd` (holdings) separately |
| **Risk** | `buildRiskFramework({ portfolioValue: tradingCapital })` — crypto excluded from cap base |

---

## Snapshot fields

| Column | Maps to |
|--------|---------|
| `sgd_cash` | Trading Cash SGD |
| `usd_cash` | Trading Cash USD (reference) |
| `crypto_cash_sgd` | Crypto Cash |
| `crypto_value_sgd` | Crypto Holdings |
| `portfolio_value_sgd` | Section total (`myPortfolioValue`) |
| `trading_capital_sgd` | DB generated (US/SG + sgd_cash + options) |

---

## Verification

```bash
npx vitest run lib/portfolio/cash-architecture.test.ts lib/portfolio/reconciliation.test.ts lib/portfolio/capital-pools.test.ts lib/risk/calculations.test.ts
npm run build
```

---

**Stop and wait.**
