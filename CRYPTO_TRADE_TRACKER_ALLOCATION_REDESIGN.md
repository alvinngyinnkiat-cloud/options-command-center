# Crypto Trade Tracker — Allocation Redesign

**Date:** 2026-06-08

---

## Core rule

Stablecoins (USDT, USDC, FDUSD, TUSD, DAI, etc.) are **coin holdings**, not crypto cash.

```
Coin Holdings Total     = sum of ALL crypto assets (incl. stablecoins)
Available Exchange Cash = uninvested fiat on exchange (SGD/USD cash only)
Current Crypto Portfolio Value = Coin Holdings Total + Available Exchange Cash
```

---

## What counts as what

| Asset | Classification | In rankings | In allocation chart | In deployment planner |
|-------|----------------|-------------|---------------------|----------------------|
| BTC, ETH, SOL, XRP, ADA | Coin holding | ✅ | ✅ individual slice | ❌ |
| USDT, USDC, FDUSD, TUSD, DAI | Coin holding | ✅ | ✅ individual slice | ❌ |
| Exchange SGD/USD fiat cash | Available Exchange Cash | ❌ | ✅ "Crypto Cash" slice | ✅ deployable only |

---

## Formulas

### Coin Holdings Total

```
Coin Holdings Total = Σ(all crypto tracker rows except fiat exchange cash)
```

Example: BTC S$4,000 + ETH S$2,000 + USDT S$500 + USDC S$300 = **S$6,800**

### Available Exchange Cash

Manual input or fiat cash rows (USD/SGD/CASH ticker) in tracker.

Example: Exchange SGD cash S$200 → **S$200**

### Current Crypto Portfolio Value

```
Current Crypto Portfolio Value = Coin Holdings Total + Available Exchange Cash
```

Example: S$6,800 + S$200 = **S$7,000**

---

## Allocation chart

Slices include featured coins (BTC, ETH, SOL, USDT, USDC, XRP, ADA) individually, remaining tokens grouped as **Other coins**, and **Crypto Cash** as its own slice.

Percent denominator = Current Crypto Portfolio Value (holdings + exchange cash).

Example:

| Slice | % |
|-------|---|
| BTC | 55% |
| ETH | 20% |
| USDT | 10% |
| USDC | 5% |
| SOL | 7% |
| Crypto Cash | 3% |

Implementation: `buildCryptoAllocationSlices()` in `lib/crypto/allocation.ts`  
UI: `components/crypto/CryptoAllocationChart.tsx`

---

## Coin rankings

All coin holdings ranked by current value SGD, including stablecoins.

Example:

| Rank | Ticker | Value |
|------|--------|-------|
| 1 | BTC | S$4,000 |
| 2 | ETH | S$2,000 |
| 3 | USDT | S$800 |
| 4 | SOL | S$500 |

Exchange cash is **never ranked**.

Tiers displayed: Top Holding · 2nd–5th · 6th–10th · Others

Implementation: `buildCryptoRankings()` in `lib/crypto/allocation.ts`  
UI: `components/crypto/CryptoRankingsPanel.tsx`

---

## Deployment planner

Uses **Available Exchange Cash only** — not coin holdings.

```
Available Deployable Cash = Available Exchange Cash (cryptoCashSgd)
```

Split:

| Bucket | % |
|--------|---|
| Top Holding | 50% |
| 2nd–5th Holdings | 25% |
| 6th–10th Holdings | 15% |
| Others | 10% |

Example: Exchange cash S$1,000 → Top S$500 · 2nd–5th S$250 · 6th–10th S$150 · Others S$100

Implementation: `buildCryptoDeploymentPlan()` in `lib/crypto/allocation.ts`  
UI: `components/crypto/CryptoDeploymentPlanner.tsx`

---

## Classification logic

`isCryptoCashAsset()` in `lib/portfolio/capital-pools.ts`:

- **Returns false** for stablecoin tickers (USDT, USDC, FDUSD, TUSD, DAI, etc.)
- **Returns true** only for fiat exchange cash (USD, SGD, CASH tickers or "Exchange Cash" labels)

`splitCryptoTrackerValues()` puts stablecoins into `cryptoHoldingsSgd`, not `cryptoCashSgd`.

---

## UI label changes

| Old label | New label |
|-----------|-----------|
| Crypto Cash SGD | Available Exchange Cash |
| Crypto Holdings Value SGD | Coin Holdings Total |
| Total Crypto Portfolio SGD | Current Crypto Portfolio Value |

Descriptions updated in Crypto Trade Tracker, Manual Crypto Portfolio card, and portfolio sections.

---

## Verification test case

Input:

- BTC = S$4,000
- ETH = S$2,000
- USDT = S$1,000
- Available Exchange Cash = S$500

Expected:

| Metric | Value |
|--------|-------|
| Coin Holdings Total | S$7,000 |
| Current Crypto Portfolio Value | S$7,500 |
| Deployment planner deployable | S$500 only |
| USDT in rankings | ✅ rank 3 |
| USDT in allocation chart | ✅ |
| USDT as cash | ❌ |

```bash
npm test -- lib/crypto/allocation.test.ts lib/portfolio/capital-pools.test.ts
npm run build
```

---

## Code changes

| File | Change |
|------|--------|
| `lib/portfolio/capital-pools.ts` | Stablecoins → holdings; fiat only → cash |
| `lib/crypto/allocation.ts` | **New** — chart, rankings, deployment plan |
| `lib/crypto/map-holding.ts` | Exclude fiat cash rows; allocation % vs full portfolio |
| `lib/crypto/calculations.ts` | Stablecoins included in contributions |
| `lib/supabase/queries/crypto-holdings.ts` | Builds allocation/rankings/deployment data |
| `components/crypto/CryptoAllocationChart.tsx` | **New** |
| `components/crypto/CryptoRankingsPanel.tsx` | **New** |
| `components/crypto/CryptoDeploymentPlanner.tsx` | **New** |
| `components/crypto/CryptoTrackerClient.tsx` | Renders new sections + updated copy |
| `components/crypto/CryptoSummaryCards.tsx` | Renamed stat labels |
| `components/crypto/CryptoManualPortfolioCard.tsx` | Updated labels and descriptions |

---

## Relation to prior docs

Supersedes stablecoin-as-cash behavior described in `CRYPTO_CASH_AND_COIN_ARCHITECTURE_UPDATE.md`. That doc treated USDT/USDC as Crypto Cash; this redesign moves them to Coin Holdings Total.
