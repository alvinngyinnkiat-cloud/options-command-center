# Portfolio Remove Crypto Cash Double Count

**Date:** 2026-06-08

---

## Problem

Manual **Crypto Value (SGD)** in Daily Portfolio Reconciliation already includes coin holdings and stablecoin / exchange cash.

The app was also adding **Crypto Cash** as a separate line in Overall Portfolio Value:

```
US/SG + Options + Crypto Holdings + Trading Cash SGD + Crypto Cash  ❌ double count
```

Example: Manual Crypto Value = S$7,689 (includes stablecoins) + Manual Crypto Cash S$3,000 added again → inflated total.

---

## New rule

```
Overall Portfolio Value =
  US Stocks & Options SGD Equivalent
+ SG Stocks/ETFs Value
+ Trading Cash SGD
+ Crypto Value SGD
```

**Crypto Value SGD** is a **single line** that already includes:
- Coin holdings
- Crypto cash / stablecoins

Crypto Cash remains visible in the Crypto section and Manual Crypto Cash card as **breakdown only** — not added again to Portfolio Value when Manual Crypto Value is set.

---

## Implementation

### `resolveCryptoValueSgd()` (`lib/portfolio/cash-architecture.ts`)

- If `cryptoValueSgd` is provided → use it directly (no separate cash add-on)
- Else → `coin holdings + crypto cash` from tracker / manual cash input

### Manual reconciliation (`buildSectionPortfolioValueSgd`)

```typescript
const cryptoValueSgd =
  override.manualCryptoValueSgd ??
  buildCryptoPortfolioValueSgd(holdings, cryptoCash);

buildPortfolioValueSgd({ ..., cryptoValueSgd, ... });
```

Manual Crypto Cash is **not** added on top of Manual Crypto Value.

### Trading Capital (unchanged)

```
US/SG stocks & ETFs + Trading Cash SGD + Options
```

Excludes: Crypto Value, Crypto Cash, Trading Cash USD.

---

## UI updates

| Location | Change |
|----------|--------|
| Manual Portfolio Reconciliation | Subtitle: `US/SG + options + Crypto Value + Trading Cash SGD` |
| Crypto Value field help | Total crypto includes stablecoins |
| Cash Breakdown | Crypto Cash = breakdown only |
| Crypto Portfolio section | Single Crypto Value line, no double count |
| Manual Crypto Cash card | Breakdown / display; not separate portfolio add-on when reconciliation crypto value is set |

Manual Crypto Cash **input and Save button retained**.

---

## Reconciliation impact

Section total should align closer with **Broker Portfolio Value** when Manual Crypto Value already includes stablecoins (no extra +Crypto Cash term).

Before fix (example from tests):

```
330,000 + 18,500 + 78,000 + 20,000 + 500 = 447,000  ❌
```

After fix:

```
330,000 + 18,500 + 78,000 + 20,000 = 446,500  ✅
```

---

## Files changed

| File | Change |
|------|--------|
| `lib/portfolio/cash-architecture.ts` | `cryptoValueSgd` + `resolveCryptoValueSgd()` |
| `lib/portfolio/reconciliation.ts` | Manual path uses single Crypto Value line |
| `lib/portfolio/reconciliation.test.ts` | Updated expectations + double-count test |
| `components/portfolio/ManualPortfolioOverrideCard.tsx` | Labels |
| `components/portfolio/CashBreakdownSection.tsx` | Labels |
| `components/portfolio/CryptoPortfolioSection.tsx` | Copy |
| `components/portfolio/ManualCryptoCashCard.tsx` | Breakdown-only copy |

---

## Verification

```bash
npx vitest run lib/portfolio/reconciliation.test.ts lib/portfolio/cash-architecture.test.ts lib/portfolio/capital-pools.test.ts
npm run build
```

---

## Related docs

- `CRYPTO_CASH_AND_COIN_ARCHITECTURE_UPDATE.md`
- `CRYPTO_CASH_MANUAL_INPUT_FIX.md`
