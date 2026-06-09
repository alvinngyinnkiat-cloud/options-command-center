# Portfolio Value & Cash Double-Count Audit

**Date:** 2026-06-08  
**Scope:** Read-only review of portfolio architecture — no code changes.  
**Goal:** Verify that uninvested cash is counted exactly once in portfolio value, trading capital, and risk calculations.

---

## Executive Summary

The application uses **two parallel valuation models**:

| Model | Source | Drives live dashboard? |
|-------|--------|------------------------|
| **A. Capital Pools (authoritative)** | `buildCapitalPoolsBreakdown()` | **Yes** — summary cards, risk, enriched metrics |
| **B. Reconciliation / legacy holdings** | `applyManualOverride()`, `classifyHoldingsSgd()` | **No** (comparison, charts, legacy fallbacks only) |

**Verdict for a correctly seeded account:** cash is **not double-counted** in My Portfolio Value, Trading Capital, or Available Risk **when**:

- Stock/ETF rows contain **securities only** (no cash baked into `current_value_*`).
- Options are stored in **`options_trades`** only (not duplicated as legacy `holdings` option rows).
- Uninvested SGD cash is entered **only** via **Manual Trading Cash SGD**.
- Uninvested USD cash is entered **only** via **Manual Trading Cash USD** (reference).
- Crypto stablecoins use **`crypto_holdings`** with cash/stablecoin classification — not mixed into stock values.
- Brokerage **total account value** is never added on top of position-level data.

**Confirmed double-count path:** encoding cash inside `stock_etf_holdings` (e.g. a pseudo `CASH` row in SGD) **and** entering the same amount in Manual Trading Cash SGD.

---

## 1. Verification — Your Five Questions

Answers reflect **Capital Pools (Model A)** — the path used by the live dashboard, risk engine, and enriched metrics.

| # | Question | Answer | Evidence |
|---|----------|--------|----------|
| 1 | Do US Stocks & Options values include USD cash? | **No** | `usStockValueSgd` / `usEtfValueSgd` from `stock_etf_holdings` only; options from `options_trades` MTM; USD cash is `brokerUsdCashNative` only |
| 2 | Does SG Stocks value include SGD cash? | **No** | `sgStockValueSgd` = SGD rows in `stock_etf_holdings` only |
| 3 | Is Trading Cash SGD added separately? | **Yes** | Added once in `tradingCapital` via `tradingCashSgd` |
| 4 | Is Trading Cash USD added separately? | **Yes (reference only)** | Stored as `brokerUsdCashNative`; **never** summed into SGD totals or Trading Capital |
| 5 | Is brokerage total value already including cash? | **Not in Model A** | `manual_total_portfolio_value_sgd` and reconciliation totals are **not** fed into `buildCapitalPoolsBreakdown()` |

### UI label caveat (Model B)

The **Daily Portfolio Reconciliation** card describes broker buckets that *may* include cash:

- *"US Stocks & Options … and USD cash"*
- *"SG Stocks / SG Cash … cash, or local SGD holdings"*

Those fields affect **comparison display** and stored `manual_total_portfolio_value_sgd`, **not** the authoritative capital-pools total after enrichment.

---

## 2. Exact Formulas (Currently Implemented)

### 2.1 My Portfolio Value

**Implementation:** `lib/portfolio/capital-pools.ts` → `buildCapitalPoolsBreakdown()`

```
optionsValueSgd     = Σ open personal trades.calculations.currentCloseCost
                      (status ∈ open | managed | closing; excludes client trades)

tradingCashSgd      = manual_trading_cash_sgd
                      OR legacy holdings CASH (SGD) if no manual override

tradingCapital      = usEtfValueSgd
                      + usStockValueSgd
                      + sgStockValueSgd
                      + tradingCashSgd
                      + optionsValueSgd

cryptoCapital       = cryptoHoldingsSgd + cryptoCashSgd

My Portfolio Value  = tradingCapital + cryptoCapital
```

**Bucket sources:**

| Term | Source table / field |
|------|----------------------|
| `usEtfValueSgd` | `stock_etf_holdings` where `asset_type = etf`, USD |
| `usStockValueSgd` | `stock_etf_holdings` where `asset_type = stock`, USD |
| `sgStockValueSgd` | `stock_etf_holdings` where `currency = SGD` |
| `optionsValueSgd` | `options_trades` (personal open MTM) |
| `tradingCashSgd` | `portfolio_overrides.manual_trading_cash_sgd` |
| `cryptoHoldingsSgd` | `crypto_holdings` (non-stablecoin) |
| `cryptoCashSgd` | `crypto_holdings` (USDT/USDC/etc. or `position_type = cash`) |
| `brokerUsdCashNative` | `portfolio_overrides.manual_trading_cash_usd` — **excluded from sum** |

**Aligned with your target formula:**

```
Portfolio Value ≈ Stock Positions
                + ETF Positions
                + Options Current Value
                + Crypto (holdings + crypto cash)
                + Trading Cash SGD
```

**Trading Cash USD:** stored separately; **not** included in SGD Portfolio Value unless you manually add it elsewhere (the app does not).

**Client capital:** excluded from My Portfolio Value.

---

### 2.2 Trading Capital

```
Trading Capital = usEtfValueSgd
                + usStockValueSgd
                + sgStockValueSgd
                + tradingCashSgd
                + optionsValueSgd
```

**Excludes:** crypto holdings, crypto cash, client capital, USD trading cash.

**DB mirror** (`daily_portfolio_snapshots`, generated):

```
trading_capital_sgd = us_etf_value_sgd + us_stock_value_sgd + sg_stock_value_sgd
                    + sgd_cash + current_options_value_sgd

trading_cash_sgd    = sgd_cash   (generated)
```

**Risk engine input:** `PortfolioDashboard` passes `capitalPools.tradingCapital` into `buildRiskFramework()` — not full My Portfolio Value.

---

### 2.3 Available Risk

**Implementation:** `lib/risk/calculations.ts` → `buildRiskFramework()`

```
maximumOptionsCapital   = Trading Capital × maxOptionsAllocationPct   (default 75%)

availableRiskCapacity   = max(0, maximumOptionsCapital − myOpenRisk)
```

Where:

```
myOpenRisk = Σ personal open trade maxRisk × my share
             (client trades excluded from personal risk share)
```

```
maximumRiskPerTrade     = availableRiskCapacity × maxRiskPerTradePct   (default 2.5%)
```

**Cash does not enter this formula directly.** Trading Cash SGD affects Available Risk **indirectly** because it is part of Trading Capital.

**Liquidity checks** (`lib/risk/capital-liquidity.ts`) use `tradingCashSgd` for close-requirement buffers — separate from the risk ceiling formula above.

---

### 2.4 Goal Tracking

**Implementation:** `lib/supabase/queries/financial-goals.ts` → `resolveLiveMetrics()`

```
portfolioCurrentSgd = latestSnapshot.portfolio_value_sgd
                      ?? capitalPools.myPortfolioValue
```

Progress uses `portfolioCurrentSgd` against `financial_goals` net-worth target (`buildGoalsDashboardData()`).

**Passive income goals** use dividend-derived monthly income — not portfolio cash.

**Important:** If a **stale or manually mis-entered snapshot** exists, goals prefer that snapshot over live capital pools even when holdings/cash have been updated.

---

## 3. Calculation Path Audit

| Path | What it computes | Cash handling | Status |
|------|------------------|---------------|--------|
| **Capital Pools** (`buildCapitalPoolsBreakdown`) | My Portfolio Value, Trading Capital, cash breakdown | SGD cash once via `tradingCashSgd`; USD reference only; stocks/ETFs exclude cash | ✓ **Safe** (if seeded correctly) |
| **Enriched metrics** (`applyCapitalPoolsToMetrics`) | Overwrites `portfolioValue`, `tradingCapital`, `cashValue` on dashboard | Uses pools; single SGD cash source | ✓ **Safe** |
| **Dashboard summary cards** (`CashBreakdownSection` / `PortfolioSummarySection`) | Displays `pools.myPortfolioValue`, `pools.tradingCapital`, etc. | Matches capital pools | ✓ **Safe** |
| **Portfolio dashboard risk** (`PortfolioDashboard` → `buildRiskFramework`) | Available risk on dashboard | Uses `tradingCapital`; SGD cash included once via Trading Capital | ✓ **Safe** |
| **Risk dashboard** (`buildRiskDashboardData`) | Summary, utilization, alerts | `portfolioValue` in summary = **Trading Capital**; liquidity uses `tradingCashSgd` | ✓ **Safe** |
| **Capital liquidity check** (`buildCapitalLiquidityBase`) | Close coverage, stress test | `cashAvailable = tradingCashSgd`; USD for US buying-power reference only | ✓ **Safe** |
| **Goal progress** (`resolveLiveMetrics`) | Net-worth goal current value | Snapshot-first, else capital pools | ⚠ **Potential** — stale snapshot or snapshot ≠ sum of parts |
| **Goals CAGR / projections** (`buildGoalsDashboardData`) | Derived from `portfolioCurrentSgd` | Same as goals live context | ⚠ **Potential** — inherits snapshot preference |
| **Manual reconciliation** (`applyManualOverride`) | Comparison total = `usSgd + crypto + sgSgd` | UI labels imply cash **inside** US/SG buckets; **no** separate trading-cash term | ⚠ **Potential** — misleading if user puts cash in SG/US fields **and** Manual Trading Cash (dashboard still safe; comparison card wrong) |
| **Reconciliation buckets** (`classifyReconciliationBuckets`) | Legacy holdings grouping | USD `CASH` → US bucket; SGD `CASH` → SG bucket | ⚠ **Potential** — only affects Model B; can inflate comparison if legacy CASH rows exist |
| **Legacy calculated values** (`buildCalculatedValues` / `classifyHoldingsSgd`) | Pre-enrichment portfolio metrics | Sums all `holdings` including legacy `CASH` rows | ⚠ **Potential** — overwritten for totals after enrich; still affects asset-allocation chart |
| **Asset allocation chart** (`buildAssetAllocation`) | Pie slices from pre-enrich `display.cashValue` | Built before enrich; may show legacy CASH while summary shows manual trading cash | ⚠ **Potential** — display inconsistency, not additive to My Portfolio Value |
| **Holdings breakdown presentation** (`buildPortfolioHoldingsPresentation`) | Display-only grouping | Cash from legacy `holdings` CASH rows only; **ignores** manual trading cash override | ⚠ **Potential** — under-count or duplicate **visually** vs summary cards |
| **Daily snapshot persist** (`persistDailyPortfolioRecord`) | Stores `portfolio_value_sgd`, `sgd_cash`, bucket columns | Components + form fields; generated columns derive Trading Capital | ✓ **Safe** if `portfolio_value_sgd` equals capital-pools total |
| **Portfolio history form** | User-entered `portfolioValueSgd`, `tradingCashSgd`, etc. | User can enter broker **total** as portfolio value while also entering `sgd_cash` | ⚠ **Potential** — row internal inconsistency; goals use `portfolio_value_sgd` as one number |
| **DB generated columns** | `trading_cash_sgd`, `trading_capital_sgd`, `total_assets_managed_sgd` | `sgd_cash` counted once in `trading_capital_sgd` | ✓ **Safe** |
| **Brokerage total storage** (`manual_total_portfolio_value_sgd`) | Saved on reconciliation save | **Not read** by capital pools or live dashboard | ✓ **Safe** (reference storage) |
| **Stock row includes cash** (`stock_etf_holdings` pseudo-cash) + Manual Trading Cash SGD | Both in `buildCategoryValuesSgd` and `tradingCashSgd` | Same SGD cash in two additive terms | ✗ **Confirmed Double Count** |
| **Legacy `holdings` CASH + Manual Trading Cash SGD** | `resolveTradingCash` | Manual override wins; legacy CASH ignored for pools | ✓ **Safe** |
| **Options in `options_trades` + legacy `holdings` option rows** | Model A uses trades only; Model B sums both in `classifyHoldingsSgd` | Capital pools unaffected | ⚠ **Potential** in legacy/allocation views only |
| **Crypto stablecoin in holdings feed + crypto cash split** | `applyCryptoTrackerToPortfolioRaw` excludes stablecoins from holdings feed | Counted once in `cryptoCashSgd` | ✓ **Safe** |

---

## 4. Double-Count Scenarios

### ✓ Safe (single count)

1. **Correct seeding:** positions in module tables; uninvested SGD in Manual Trading Cash only.
2. **Manual Trading Cash overrides legacy CASH rows** in `holdings` table.
3. **USD trading cash** entered only as reference — never enters SGD sums.
4. **Crypto cash** in `crypto_holdings` (USDC/USDT) — separate from Trading Capital.
5. **Client capital** tracked in client profit-sharing — excluded from My Portfolio Value.
6. **Capital pools path** is the single source for dashboard totals after `getEnrichedPortfolioMetrics()`.

### ⚠ Potential double count / mismatch (display, goals, or user error)

| Scenario | Effect |
|----------|--------|
| Cash included in **Reconciliation US/SG fields** and also in **Manual Trading Cash** | Dashboard totals OK (Model A); reconciliation comparison inflated |
| **Latest portfolio snapshot** predates cash/holding updates | Goals use stale `portfolio_value_sgd` |
| **Portfolio history form** `portfolioValueSgd` = broker total while `sgd_cash` also set | Snapshot row inconsistent; goals use the total field once (not additive, but may be wrong) |
| **Legacy `holdings` CASH** still present + **asset allocation chart** | Chart may show cash from legacy rows while summary uses manual cash — visual mismatch |
| **Holdings breakdown** vs **summary cards** | Breakdown may miss manual trading cash |
| **Legacy option rows** in `holdings` + live `options_trades` | Inflates Model B / allocation; not capital pools |

### ✗ Confirmed double count

| Scenario | Mechanism |
|----------|-----------|
| **Cash row in `stock_etf_holdings`** (SGD ticker treated as stock) **+ Manual Trading Cash SGD** | Counted in `sgStockValueSgd` **and** `tradingCashSgd` |
| **Brokerage total entered as stock/ETF `current_value`** (cash embedded in security values) **+ Manual Trading Cash SGD** | Security bucket overstated **and** cash added again |

---

## 5. Recommended Architecture (Matches Your Rules)

### Target formula

```
My Portfolio Value =
    US Stock Value (SGD)
  + US ETF Value (SGD)
  + SG Stock Value (SGD)
  + Options Current Value (open personal MTM)
  + Crypto Holdings Value (SGD)
  + Crypto Cash (SGD)
  + Trading Cash SGD

Trading Capital =
    US Stock + US ETF + SG Stock + Options MTM + Trading Cash SGD
  (excludes crypto, client capital, USD cash)

Total Assets Managed = My Portfolio Value + Client Current Value
```

### Data entry rules

| Data | Where to enter | Must exclude |
|------|----------------|--------------|
| Individual stocks | `stock_etf_holdings` (`asset_type=stock`) | Cash |
| ETFs | `stock_etf_holdings` (`asset_type=etf`) | Cash |
| Open options | `options_trades` | Cash; do not duplicate in `holdings` |
| Crypto coins | `crypto_holdings` (`position_type=holding`) | Stablecoins |
| Crypto / exchange cash | `crypto_holdings` (USDC/USDT, `position_type=cash`) | — |
| Uninvested SGD cash | **Manual Trading Cash SGD** only | Do not put in stock tables or SG reconciliation field |
| Uninvested USD cash | **Manual Trading Cash USD** only (reference) | Do not convert or add to SGD totals |
| Brokerage account total | Reconciliation notes / reference field only | **Never** add on top of positions + cash |

### Seeding order (recommended)

```
1. watchlist
2. stock_etf_holdings     ← securities only
3. crypto_holdings        ← holdings vs cash split
4. options_trades         ← open positions
5. dividend_records
6. monthly_contributions
7. Manual Trading Cash    ← portfolio_overrides (SGD + USD reference)
8. daily_portfolio_snapshots  ← after verifying dashboard totals match
```

### Post-seed validation checklist

```
□ My Portfolio Value on dashboard = manual sum of buckets (within rounding)
□ Trading Capital = stocks + ETFs + SG + options MTM + Trading Cash SGD
□ Trading Cash USD appears in UI but does NOT change SGD totals
□ Total Cash (net worth) = Trading Cash SGD + Crypto Cash SGD
□ Goals portfolio current matches latest snapshot OR live pools (refresh snapshot if stale)
□ No CASH pseudo-rows in stock_etf_holdings
□ No duplicate option rows in legacy holdings table
□ Reconciliation US/SG fields exclude cash if Manual Trading Cash is used
```

### Example (illustrative)

| Bucket | Amount (SGD) |
|--------|--------------|
| US ETFs | 50,000 |
| US Stocks | 30,000 |
| SG Stocks | 15,000 |
| Options MTM | 5,000 |
| Trading Cash SGD | 20,000 |
| Crypto holdings | 12,000 |
| Crypto cash | 3,000 |
| **My Portfolio Value** | **135,000** |
| **Trading Capital** | **120,000** (excludes 15k crypto) |

Unit test reference: `lib/portfolio/capital-pools.test.ts` — `"builds trading and crypto capital separately"`.

---

## 6. Key Source Files

| Concern | File |
|---------|------|
| Authoritative pools | `lib/portfolio/capital-pools.ts` |
| Dashboard enrichment | `lib/portfolio/enrich-capital-pools.ts` |
| Stock bucket split | `lib/stocks-etfs/build-tab-data.ts` → `buildCategoryValuesSgd()` |
| Manual trading cash UI | `components/portfolio/ManualTradingCashCard.tsx` |
| Reconciliation UI | `components/portfolio/ManualPortfolioOverrideCard.tsx` |
| Legacy / reconciliation math | `lib/portfolio/calculations.ts` |
| Risk framework | `lib/risk/calculations.ts`, `lib/risk/summary.ts` |
| Goal live value | `lib/supabase/queries/financial-goals.ts` → `resolveLiveMetrics()` |
| Snapshot persist | `lib/supabase/queries/daily-portfolio-snapshots.ts` |
| Business rules | `PROJECT_RULES.md` §1, §4, §5, §6 |

---

## 7. Conclusion

For your brokerage setup (stocks, ETFs, options, uninvested cash):

- **The capital-pools path is architecturally correct** — cash is a separate additive term; USD cash is reference-only; crypto cash is separate from trading cash; client capital is excluded.
- **Double counting is avoided** when positions and cash are stored in the right tables and brokerage totals are not added on top.
- **The main risks are operational:** mis-seeded cash inside stock values, reconciliation fields that bundle cash with securities, stale portfolio snapshots for goals, and legacy display paths that can disagree with summary cards.

**Operational rule:** treat **Manual Trading Cash SGD** as the only source of uninvested SGD cash in calculations; never embed cash in `stock_etf_holdings` or add brokerage totals alongside line-item data.

---

*End of audit — no code modified.*
