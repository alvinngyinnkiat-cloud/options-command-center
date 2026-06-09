# Portfolio Cash Inclusion Update

**Phase:** Portfolio calculation rule change  
**Date:** 2026-06-08

---

## Problem

When entering portfolio sections individually (US, SG, crypto, trading cash), **My Portfolio Value** did not tally because:

1. Manual reconciliation used **broker total** (`manual_total_portfolio_value_sgd`) as the active dashboard value.
2. **Trading Cash SGD** was included in `appCalculatedValueSgd` but **excluded** from the manual override bucket sum used for `myPortfolioValue`.
3. Users saw a mismatch between section entries and the headline portfolio number.

---

## New rule

```
Portfolio Value =
  US Stock/ETF Value
+ SG Stock/ETF Value
+ Options Current Value
+ Crypto Value
+ Trading Cash SGD
```

| Item | Rule |
|------|------|
| **Trading Cash SGD** | Included in Portfolio Value **and** Trading Capital / risk (75% cap) |
| **Trading Cash USD** | Reference only — never converted to SGD, never in totals |
| **Broker total** | Reference / reconciliation only — **not** added on top of sections |
| **Client capital** | Excluded from My Portfolio Value |
| **Crypto** | In Portfolio Value; **excluded** from Trading Capital |

---

## Where Trading Cash was excluded (before)

| Location | Issue |
|----------|--------|
| `resolveManualOverallPortfolioValueSgd()` | Used as `myPortfolioValue` when manual override on — broker total without trading cash |
| `resolveActivePortfolioValueSgd(manual, app)` | Preferred manual overall over app calculated |
| `applyManualOverride()` in `calculations.ts` | `portfolioValue = usSgd + crypto + sg` — no trading cash |
| Dashboard copy | Stated SGD cash was “not added to manual overall” |

`buildAppCalculatedPortfolioValue()` already included `tradingCashSgd` — but was only used when manual override was off or as a comparison baseline.

---

## Code changes

### `lib/portfolio/reconciliation.ts`

| Function | Purpose |
|----------|---------|
| `buildSectionPortfolioValueSgd()` | **New** — active portfolio total from sections + Trading Cash SGD |
| `resolveBrokerReferencePortfolioValueSgd()` | Broker total for reconciliation reference only |
| `resolveActivePortfolioValueSgd()` | Returns section total (single argument) |
| `resolvePortfolioValueSource()` | `"sections"` when manual sections or broker ref active |

**Manual US SGD equivalent** includes US options (per reconciliation UI) — options are **not** double-counted when that field is set.

### `lib/portfolio/capital-pools.ts`

```
myPortfolioValue           = buildSectionPortfolioValueSgd(...)
brokerReferencePortfolioValueSgd = resolveBrokerReferencePortfolioValueSgd(...)
portfolioValueDifferenceSgd      = brokerReference − myPortfolioValue
tradingCapital               = US ETF + US Stock + SG Stock + options + Trading Cash SGD  (unchanged)
```

### UI

| File | Update |
|------|--------|
| `CashBreakdownSection.tsx` | Banner: “SGD cash is included in Portfolio Value and Trading Capital. USD cash is reference only.” |
| `ManualTradingCashCard.tsx` | Matching copy |
| `ManualPortfolioOverrideCard.tsx` | Broker = reference; section total = active value |

---

## Exact formulas (after)

### Portfolio Value (active)

**Tracker-only (no manual sections):**

```
myPortfolioValue =
  usEtfValueSgd + usStockValueSgd + sgStockValueSgd
+ optionsValueSgd + cryptoHoldingsSgd + cryptoCashSgd + tradingCashSgd
```

**Manual sections enabled:**

```
myPortfolioValue =
  manualUsStocksOptionsSgdEquivalent  (or tracker US total)
+ manualSgStocksCashValueSgd          (or tracker SG total)
+ optionsValueSgd                     (0 if manual US set — options included there)
+ manualCryptoValueSgd                (or tracker crypto total)
+ tradingCashSgd
```

### Trading Capital (unchanged)

```
tradingCapital =
  usEtfValueSgd + usStockValueSgd + sgStockValueSgd
+ optionsValueSgd + tradingCashSgd
```

Crypto excluded.

### Risk capacity (unchanged)

```
maximumOptionsCapital = tradingCapital × 75%
availableRiskCapacity = maximumOptionsCapital − currentOpenRisk
```

Implemented in `lib/risk/calculations.ts` → `buildRiskFramework()`.

### Broker reference (reconciliation only)

```
brokerReference =
  manual_total_portfolio_value_sgd
  OR manualUsSgd + manualCrypto + manualSg   (legacy bucket sum)
```

```
difference = brokerReference − myPortfolioValue
```

---

## Verification

### Unit tests

```bash
npx vitest run lib/portfolio/reconciliation.test.ts lib/portfolio/capital-pools.test.ts
```

| Test | Result |
|------|--------|
| Section total includes trading cash with manual override | ✅ `446,500 = 330k + 18.5k + 78k + 20k` |
| Broker reference ≠ section total (reconciliation gap) | ✅ Difference `−20,000` |
| Tracker-only path includes trading cash | ✅ `115,000` with 20k cash |
| Example broker-style sections + 6914.90 SGD cash | ✅ Tallies |

### Risk / trading capital

```bash
npx vitest run lib/risk/capital-liquidity.test.ts lib/risk/calculations.test.ts
```

Trading Capital excludes crypto; 75% options cap unchanged.

### Build

```bash
npm run build
```

**Result:** ✅ Passed

---

## Example (user broker figures)

| Section | Value |
|---------|------:|
| US SGD equivalent | 27,149.08 |
| SG holdings | 9,334.00 |
| Crypto | 0 |
| Trading Cash SGD | 6,914.90 |
| **Section total** | **43,397.98** |
| Broker reference | 36,483.08 |
| **Difference** | **−6,914.90** (broker total likely embeds cash differently) |

Portfolio Value on dashboard = **43,397.98** (sections + SGD cash), not broker headline alone.

---

## Files modified

| File |
|------|
| `lib/portfolio/reconciliation.ts` |
| `lib/portfolio/capital-pools.ts` |
| `lib/portfolio/calculations.ts` |
| `lib/portfolio/reconciliation.test.ts` |
| `components/portfolio/CashBreakdownSection.tsx` |
| `components/portfolio/ManualTradingCashCard.tsx` |
| `components/portfolio/ManualPortfolioOverrideCard.tsx` |

---

**Stop and wait.**
