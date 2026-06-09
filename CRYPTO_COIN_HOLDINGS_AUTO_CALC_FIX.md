# Crypto Coin Holdings Auto-Calc Fix

**Date:** 2026-06-08

---

## Problem

Coin Holdings Total was an editable manual input on the Crypto Trade Tracker. Users enter individual coin values separately, so the total should be derived automatically.

---

## Solution

```
Coin Holdings Total = SUM(individual coin current_value_sgd)
```

- **Read-only** on Crypto Trade Tracker and Portfolio Dashboard
- **Auto-recalculates** when any coin is added, edited, or deleted
- **Persists** via synced `manual_crypto_holdings_sgd` and `manual_crypto_value_sgd` in `portfolio_overrides`

---

## Formulas (unchanged)

| Metric | Formula |
|--------|---------|
| Coin Holdings Total | Sum of all crypto tracker rows (incl. stablecoins) |
| Available Exchange Cash | Manual input — exchange fiat only |
| Current Crypto Portfolio Value | Coin Holdings Total + Available Exchange Cash |

---

## Behaviour

### Crypto Trade Tracker

- **Coin Holdings Total** — read-only display card (not an input)
- **Available Exchange Cash** — editable
- **Total Crypto Contributions / Cost** — editable (for P/L)
- Per-asset table remains the source of truth for coin values

### Portfolio Dashboard

- **Manual Portfolio Breakdown** — Current Crypto Portfolio Value is read-only, sourced from `pools.cryptoPortfolioValueSgd`
- Section totals use computed crypto (coin rows + exchange cash), not a stale manual crypto value

### Sync triggers

| Action | Sync |
|--------|------|
| Add / edit / delete crypto holding | Recompute holdings total + portfolio value |
| Save exchange cash & contributions | Recompute holdings total from DB rows + save cash |

---

## Code changes

| File | Change |
|------|--------|
| `lib/crypto/sync-portfolio-totals.ts` | **New** — compute and apply totals from coin rows |
| `lib/portfolio/capital-pools.ts` | `resolveCryptoHoldingsSgd` always uses tracker sum |
| `lib/portfolio/reconciliation.ts` | Section totals use computed crypto value |
| `app/actions/crypto.ts` | Save/sync without manual holdings input |
| `components/crypto/CryptoManualPortfolioCard.tsx` | Read-only holdings total |
| `components/portfolio/ManualPortfolioOverrideCard.tsx` | Read-only crypto portfolio value |

---

## Verification

Example: BTC 4,000 + ETH 2,000 + USDT 1,000 + Exchange Cash 500

| Field | Value |
|-------|-------|
| Coin Holdings Total | S$7,000 (read-only) |
| Current Crypto Portfolio Value | S$7,500 |

```bash
npm test -- lib/crypto/sync-portfolio-totals.test.ts lib/portfolio/reconciliation.test.ts
npm run build
```

---

## Relation to prior docs

Builds on [`CRYPTO_TRADE_TRACKER_ALLOCATION_REDESIGN.md`](./CRYPTO_TRADE_TRACKER_ALLOCATION_REDESIGN.md) — stablecoins remain coin holdings; only exchange fiat is cash.
