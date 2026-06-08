# Investment Manager — Project Knowledge

> Audit snapshot generated from full codebase review.  
> Canonical business rules live in [`PROJECT_RULES.md`](./PROJECT_RULES.md).  
> This document describes **what the code actually does today**, including gaps and conflicts.

---

## Canonical Rules (non-negotiable)

| Rule | Implementation anchor |
|------|------------------------|
| My Portfolio Value excludes client capital | `buildCapitalPoolsBreakdown()` — `myPortfolioValue = tradingCapital + cryptoCapital`; client in `clientCurrentValue` only |
| Financial Goals use My Portfolio Value only | `resolveLiveMetrics()` — `portfolioCurrentSgd` from snapshot or `capitalPools.myPortfolioValue`; AUM excluded |
| Trading Cash SGD is manual and used for calculations | `resolveTradingCash()` → `tradingCashSgd`; `portfolio_overrides.manual_trading_cash_sgd` |
| Trading Cash USD is reference only | `brokerUsdCashNative` — never in `tradingCapital` or `tradingCashSgd` |
| Trading Capital excludes crypto | `buildCapitalPoolsBreakdown()` — crypto in separate `cryptoCapital` pool |
| Options risk capacity = 75% of Trading Capital | `buildRiskFramework()` — `maximumOptionsCapital = tradingCapital × 75%` |
| Dividend Tracker is source of truth | `dividend_records` table; `buildDividendPortfolioSummary()` fans out to all consumers |
| Support/Resistance are manual only | SQL triggers + scoring rules; never auto-generated |

---

## Table of Contents

1. [Portfolio Architecture](#1-portfolio-architecture)
2. [Cash Architecture](#2-cash-architecture)
3. [Client Capital Architecture](#3-client-capital-architecture)
4. [Trading Capital Calculation](#4-trading-capital-calculation)
5. [Dividend Architecture](#5-dividend-architecture)
6. [Goal Tracking Architecture](#6-goal-tracking-architecture)
7. [Risk Dashboard Architecture](#7-risk-dashboard-architecture)
8. [Supabase Table Architecture](#8-supabase-table-architecture)
9. [Current Blockers](#9-current-blockers)
10. [Logic Conflicts with Intended Rules](#10-logic-conflicts-with-intended-rules)

---

## 1. Portfolio Architecture

### Mental model

```
My Portfolio Value = Trading Capital + Crypto Capital
AUM (informational)  = My Portfolio Value + Client Current Value
```

Client capital is **separate** from personal net worth. Goals, CAGR, and milestones use **My Portfolio Value only** — not AUM.

### Layer stack

| Layer | Path | Role |
|-------|------|------|
| Types | `lib/portfolio/types.ts` | `PortfolioMetrics`, `PortfolioRawInput`, override types |
| Base calculations | `lib/portfolio/calculations.ts` | Holdings classification, returns, manual override, `buildPortfolioMetrics` |
| Capital pools (authoritative) | `lib/portfolio/capital-pools.ts` | Trading vs crypto split, cash breakdown, AUM |
| Enrichment | `lib/portfolio/enrich-capital-pools.ts` | Wires DB queries → capital pools → enriched metrics |
| Data fetch | `lib/supabase/queries/portfolio.ts` | Supabase/mock raw input assembly |
| Current state | `lib/portfolio/current-state.ts` | Live dashboard grid values |
| Snapshots | `lib/portfolio/daily-snapshot.ts`, `lib/portfolio/snapshot-history.ts` | Persist + history/performance |
| Client capital | `lib/portfolio/client-capital.ts` | Client NAV from profit-sharing summary |
| UI entry | `components/portfolio/PortfolioDashboard.tsx` | Server component orchestrator |

### Data flow

```
holdings + overrides + trades + snapshots
  → getPortfolioDashboardData()
  → withAssetTrackers (crypto + stock/ETF trackers replace legacy holdings)
  → buildPortfolioMetrics()          [base layer — placeholders until enriched]
  → buildCapitalPoolsBreakdown()     [authoritative capital split]
  → applyCapitalPoolsToMetrics()
  → Portfolio Dashboard / Risk / Goals / Reports
```

**Primary entry point:** `getEnrichedPortfolioMetrics()` in `lib/portfolio/enrich-capital-pools.ts`.

### Two calculation modes (important)

#### Base layer — `buildPortfolioMetrics()` (`lib/portfolio/calculations.ts`)

Before enrichment:

- Classifies holdings into reconciliation buckets (US stocks/options USD, crypto SGD, SG stocks/cash SGD).
- Applies manual override when `useManualOverride` is active.
- Sets **placeholder** capital fields:
  - `tradingCapital = portfolioValue` (wrong until enriched)
  - `tradingCashSgd = display.cashValue` (all cash, not split)

Any code calling `getPortfolioDashboardData()` **without** enrichment gets incorrect capital split.

#### Authoritative layer — `buildCapitalPoolsBreakdown()` (`lib/portfolio/capital-pools.ts`)

After enrichment via `applyCapitalPoolsToMetrics()`:

```
myPortfolioValue = tradingCapital + cryptoCapital
```

Stock values come from the **stock/ETF tracker** (`lib/stocks-etfs/build-tab-data.ts`), not generic `holdings` buckets. Options value comes from **personal open trades only** (`!isClientTrade`).

### Portfolio metrics formulas

| Metric | Formula | Source |
|--------|---------|--------|
| Net contributions | `deposits − withdrawals`, or fallback `Σ(cost_basis ?? market_value_sgd)` | `portfolio_raw` or holdings |
| Net P/L | `portfolioValue − netContributions` | Display portfolio value |
| Return % | `(netProfitLoss / netContributions) × 100` | Same |
| Annualized return | `(currentValue/netContributions)^(1/years) − 1` | Oldest snapshot inception date |
| Health score | Weighted 0–100 (allocation, risk capacity, diversification, DTE, return) | `lib/portfolio/health-score.ts` |

### Daily snapshots

**Table:** `daily_portfolio_snapshots`  
**Write:** `upsertDailyPortfolioSnapshot()` → `buildDailySnapshotPayload()` in `lib/supabase/queries/daily-portfolio-snapshots.ts`

Key persisted fields:

- `portfolio_value_sgd` — **My Portfolio Value only** (excludes client capital)
- `client_initial_capital_sgd`, `client_current_value_sgd`
- `total_assets_managed_sgd` — DB generated: `portfolio_value_sgd + client_current_value_sgd`
- `trading_cash_sgd` — DB generated: `sgd_cash` only (post-refinement migration)
- `trading_capital_sgd` — DB generated: `us_etf + us_stock + sg_stock + sgd_cash + current_options_value_sgd`

**History:** `lib/portfolio/snapshot-history.ts` — performance comparisons, MTD P/L, achievement milestones.

### Current state grid (`buildPortfolioCurrentState`)

| Field | Source priority |
|-------|-----------------|
| `portfolioValue` | `capitalPools.myPortfolioValue` → latest snapshot → `metrics.myPortfolioValue` |
| `dailyChange` / `dailyChangePct` | Snapshot history performance |
| `availableRiskCapacity` | Recalculated: `tradingCapital × 75% − myOpenRisk` |
| `openRisk` | `buildTradeTrackerSummary().totalOpenRisk` (gross — see conflicts) |
| `cashAvailability` | `capitalPools.tradingCashSgd` |

### Asset tracker integration

- **Crypto:** `lib/portfolio/crypto-integration.ts` — crypto tracker rows replace legacy crypto holdings; stablecoins excluded from holdings aggregate.
- **Stocks/ETFs:** `lib/portfolio/stock-etf-integration.ts` — tracker rows replace legacy stock/ETF holdings.
- Generic `holdings` table cash rows remain as broker cash fallback.

### Dashboard pages

| Route | Component | Data source |
|-------|-----------|---------------|
| `/` | `PortfolioDashboard` | `getEnrichedPortfolioMetrics`, trades, ticker positions, data health widget |
| `/stocks` | Stock/ETF tracker | `getStockEtfTrackerData` |
| `/crypto` | Crypto tracker | `getCryptoTrackerData` |
| `/trades` | Options trade tracker | `getOptionsTradesData` |
| `/ticker-positions` | Aggregated positions | `getTickerPositionManagerData` |

---

## 2. Cash Architecture

### Two cash pools

| Pool | Includes | Used for |
|------|----------|----------|
| **Trading Cash** | Manual SGD broker cash (`tradingCashSgd`) | Stocks, ETFs, options, risk, trading capital |
| **Crypto Cash** | Stablecoins (USDT, USDC, CASH, etc.) on crypto exchange | Crypto investing only |
| **Total Cash** | `tradingCashSgd + cryptoCashSgd` | Net worth display only |

**USD broker cash** (`brokerUsdCashNative`) is **reference only** — never added to SGD trading cash or trading capital.

### Resolution logic (`lib/portfolio/capital-pools.ts`)

```
resolveTradingCash(manual, holdings):
  if manual override → use manualTradingCashUsd (reference) + manualTradingCashSgd (calculations)
  else → extractTradingCash(holdings)   // SGD CASH ticker only for tradingCashSgd

extractTradingCash:
  CASH + currency SGD → brokerSgdCash, tradingCashSgd
  CASH.USD / CASH.* + USD → brokerUsdCashNative only (not in trading capital)
```

Manual override stored in `portfolio_overrides`:

- `manual_trading_cash_usd` — reference
- `manual_trading_cash_sgd` — sole SGD input for calculations
- Legacy fallback: `manual_cash_value_sgd` mapped to SGD field in `portfolio.ts`

UI: `components/portfolio/ManualTradingCashCard.tsx`, `components/portfolio/CashBreakdownSection.tsx`.

### Crypto cash detection

`isCryptoCashAsset(ticker, assetLabel)` — true for USDT, USDC, USD, SGD, CASH, STABLECOIN, or labels containing "STABLE"/"CASH".

### Risk module cash (`lib/risk/capital-liquidity.ts`)

- `extractCashBalances()` — finds `CASH` (SGD) and `CASH.*` (USD) from holdings
- `cashAvailable = tradingCashSgd` — SGD only
- `usdTradingBuyingPower = cashUsdNative − currentOpenRisk` — USD reference minus **gross** open risk
- Liquidity checks use SGD trading cash vs position close requirements

### DB alignment

Migration `20260608120000_trading_cash_manual_refinement.sql`:

- `trading_cash_sgd = sgd_cash` (GENERATED)
- `usd_cash_sgd_equivalent` deprecated — app writes `0`
- Supersedes earlier migration that summed USD equivalent + SGD

---

## 3. Client Capital Architecture

### Conceptual model

Client capital is a **separate profit-sharing pool**. It does not count toward My Portfolio Value, goals, CAGR, or milestones. It appears only in AUM (informational).

### Client NAV formula (`lib/portfolio/client-capital.ts`)

```
clientInitialCapital = Σ client_profiles.capital_contributed
clientPnl            = summary.totalClientNetPl   (lifetime client share of trade P/L)
clientCurrentValue   = clientInitialCapital + clientPnl
clientReturnPct      = (clientPnl / clientInitialCapital) × 100   (if initial > 0)

totalAssetsManaged   = myPortfolioValue + clientCurrentValue
```

### Profit sharing pipeline

| Step | File | Function |
|------|------|----------|
| Trade P/L split | `lib/trades/pnl-allocation.ts` | `calculateMyPnL`, `calculateClientPnL`, `calculateRiskShare` |
| Allocation rows | `lib/client-profit-sharing/calculations.ts` | `buildTradeAllocationRows` |
| Summary | same | `buildClientProfitSharingSummary` |
| Client metrics | `lib/portfolio/client-capital.ts` | `buildClientCapitalMetrics` |
| DB | `client_profiles`, `client_trade_allocations` | via `getClientProfitSharingData()` |

**Summary aggregation:**

- `totalClientNetPl` = lifetime client share on included trades
- `outstandingAmountOwed = totalClientNetPl − totalPaidToClient`
- Default split: 40% client / 60% my (per trade or client profile)

**Snapshot fields:** `client_pnl`, `client_initial_capital_sgd`, `client_current_value_sgd` written on each daily snapshot.

**UI:** `components/portfolio/AssetsUnderManagementSection.tsx` — explicitly states AUM is not used for goals/CAGR/milestones.

**Route:** `/client-profit-sharing`

### Note

`buildCapitalPoolsBreakdown()` accepts `tradeAllocations: TradeAllocationRow[]` but **never reads it**; client metrics come only from `clientSummary`.

---

## 4. Trading Capital Calculation

### Runtime formula (`lib/portfolio/capital-pools.ts`)

```
tradingCapital =
  usEtfValueSgd
+ usStockValueSgd
+ sgStockValueSgd
+ tradingCashSgd          // manual SGD only
+ optionsValueSgd         // personal open trades only
```

Where:

```
optionsValueSgd = Σ personalOpenTrades.calculations.currentCloseCost
personalOpenTrades = openTrades.filter(t => !t.isClientTrade)
```

Stock categories from `buildCategoryValuesSgd()`:

- SGD currency → `sgStockValueSgd`
- USD + ETF → `usEtfValueSgd`
- USD + stock → `usStockValueSgd`

**Excluded from trading capital:** crypto holdings, crypto cash, USD broker cash, client capital, client trade options value.

### DB generated column (snapshots)

Same formula stored as generated column (post-refinement):

```
trading_capital_sgd = us_etf + us_stock + sg_stock + sgd_cash + current_options_value_sgd
```

### Risk capacity (uses trading capital)

From `lib/risk/calculations.ts` + `lib/constants/trading-rules.ts`:

```
maximumOptionsCapital = tradingCapital × (maxOptionsAllocationPercent / 100)   // default 75%
availableRiskCapacity = max(0, maximumOptionsCapital − myOpenRisk)
maximumRiskPerTrade   = availableRiskCapacity × (maxRiskPerTradePercent / 100)  // default 2.5%
```

Crypto capital is excluded from options allocation and risk capacity.

---

## 5. Dividend Architecture

### Source of truth

**`dividend_records` table** is the single source of truth for dividend income. Migration `20260607220700_drop_stock_etf_dividend_columns.sql` removed dividend columns from `stock_etf_holdings`.

### Key files

| Layer | Path |
|-------|------|
| Types | `lib/dividends/types.ts` |
| Providers | `lib/dividends/dividend-data-service.ts` |
| Formulas | `lib/dividends/calculations.ts` |
| Sync | `lib/dividends/sync-dividends.ts` |
| Persistence | `lib/supabase/queries/dividend-records.ts` |
| Actions | `app/actions/dividend-records.ts` |
| UI | `components/dividends/*` |

### Providers

| Provider | Env key | Selection order |
|----------|---------|-----------------|
| FMP | `FMP_API_KEY` | Primary |
| Alpha Vantage | `ALPHA_VANTAGE_API_KEY` | Fallback |
| Mock | — | Last resort |

`getActiveDividendProvider()` — FMP → AV → Mock.  
`fetchDividendsForTicker()` tries primary, then AV, then mock.

### Sync pipeline

```
syncDividendsFromApi (action)
  → syncDividendsForUser(userId)
  → getStockEtfHoldingsRows() (holdings with shares > 0)
  → for each holding: fetchDividendsForTicker()
  → compute gross/net/SGD per event
  → upsertApiDividendRecord()
  → revalidate /dividends, /goals, /ticker-positions, etc.
```

Per event:

1. Uses **current** `holding.sharesHeld` (not historical share count at ex-date)
2. Applies **hardcoded 15% US withholding**
3. Sets `status`/`is_received` from payment date vs runtime `new Date()` (not `MOCK_REFERENCE_DATE`)
4. Stores `api_reference_id` from provider

**Manual override rule:** sync skips rows where existing `api_reference_id` has `is_manual_override === true`.

### Formulas (`lib/dividends/calculations.ts`)

| Function | Formula |
|----------|---------|
| `calculateGrossDividend` | `round(dps × shares, 2)` |
| `calculateNetDividend` | `round(gross − withholding, 2)` |
| `computeSgdEquivalent` | SGD → net; else `net × fxRateToSgd` |
| `buildTickerDividendTotals` | Per ticker: lifetime net, YTD net/gross, trailing-12mo net |
| `resolveTickerDividendIncome` | Annual = YTD net if > 0 else trailing-12mo |
| `calculateDividendYieldPct` | `annualIncome / marketValue × 100` |

**Aggregation uses `net_dividend` (native currency), not `sgd_equivalent`.**  
**Reference date:** YTD/trailing windows use `MOCK_REFERENCE_DATE` (`"2026-06-06"`) even in Supabase mode.

### Downstream consumers

```
dividend_records
  → buildDividendPortfolioSummary()
  → byTicker: Map<ticker, TickerDividendTotals>
  → stock/ETF enrichment (annualDividendIncome, dividendYield)
  → US/SG market aggregates (ticker-positions)
  → computePassiveIncomeMonthlySgd() (goals)
  → auditDividendData (data health)
```

Cross-page refresh: `notifyDividendDataUpdated()` → `useDividendDataSync` → `refreshDividendDependentData()`.

**Route:** `/dividends`

---

## 6. Goal Tracking Architecture

### Three partially overlapping goal systems

1. **DB-managed goals** — `financial_goals` table → `ManagedFinancialGoal[]` via `buildManagedGoals`
2. **Legacy projection dashboard** — `GoalsDashboardData` from `GoalsRawInput` (portfolio + passive income, timeline, CAGR)
3. **Snapshot milestones** — hardcoded thresholds in `snapshot-history.ts` (`[250k, 500k, 750k, 1M]`) + browser localStorage custom milestones in `MilestoneTrackerPanel`

The goals page uses **(1) and (2)**; milestones use **(3)** independently.

### Key files

| Layer | Path |
|-------|------|
| Types | `lib/goals/types.ts`, `lib/goals/goal-models.ts` |
| Projection math | `lib/goals/calculations.ts` |
| Live value resolution | `lib/goals/resolve-current-value.ts` |
| Managed goals | `lib/goals/build-managed-goals.ts` |
| Dashboard | `lib/supabase/queries/goals.ts` |
| CRUD | `lib/supabase/queries/financial-goals.ts` |
| UI | `components/goals/*` (19 components) |

### Goal types

`GoalType`: `income` | `net_worth` | `allocation` | `risk_capacity` | `custom`

**Default seeds** (`DEFAULT_GOAL_SEEDS`):

- Portfolio Value — `net_worth`, target 100k SGD, date 2028-12-31
- Passive Income — `income`, target 10k SGD/month, `assumed_yield_pct: 4%`

Auto-seeded when no active rows exist. Changes audited in `financial_goal_changes`.

### Progress calculation

#### Live current values (`resolve-current-value.ts`)

| `goal_type` | Current value source |
|-------------|---------------------|
| `net_worth` | `ctx.portfolioCurrentSgd` |
| `income` | `ctx.passiveIncomeMonthlySgd` |
| Other | Stored `goal.current_amount` |

**Passive income:**

```
annual = US.totalAnnualPremiumIncome + US.totalAnnualDividendIncome + SG.totalAnnualDividendIncome
monthly = annual / 12
```

US premium/dividend figures are in **USD**; SG dividends in **SGD**; targets labeled **SGD** (see conflicts).

#### Portfolio value for goals

```
portfolioCurrentSgd = latestSnapshot?.portfolioValueSgd ?? capitalPools.myPortfolioValue
asOfDate = latestSnapshot?.snapshotDate ?? MOCK_REFERENCE_DATE
```

#### Projection formulas (`lib/goals/calculations.ts`)

| Metric | Formula |
|--------|---------|
| `calculateProgressPercent` | `min(100, current/target × 100)` |
| `calculateRequiredCagr` | `(target/current)^(1/years) − 1` × 100 |
| `projectPortfolioValue` | Monthly compound + contributions |
| `calculateRequiredPortfolioSize` | `(monthlyTarget × 12) / (yield% / 100)` |
| `actualCagr` | From snapshot series via `calculateAnnualizedReturn` |

**Route:** `/goals`

---

## 7. Risk Dashboard Architecture

### Entry points

| Layer | Path |
|-------|------|
| Page | `app/(dashboard)/risk/page.tsx` |
| Server loader | `components/risk/RiskDashboard.tsx` |
| Query | `lib/supabase/queries/risk-dashboard.ts` |
| Builder | `lib/risk/summary.ts` |
| UI | `components/risk/RiskDashboardClient.tsx` |

**Pipeline:**

```
getEnrichedPortfolioMetrics()
getOptionsTradesData()
getRiskSettings(userId)
  → buildRiskDashboardData()
  → RiskDashboardClient
```

### Open risk computation

**Eligible trades:** status ∈ `{ open, managed, closing }`.

**Per-trade `maxRisk`** — `lib/trades/calculations.ts` → `buildTradeCalculations()`:

| Strategy | Formula |
|----------|---------|
| Spreads (bull put, bear call, iron condor) | `(spreadWidth × 100 × contracts) − totalPremiumReceived` |
| Sell put | `strike × 100 × contracts − premium` |
| Covered call | `(strike × 100 × contracts) − premium` |
| Naked call | `maxRisk = 0`, `unlimitedRisk = true` |
| Debit long (LEAPS, vertical call) | `originalCost` or premium paid |

**Aggregates** (`lib/risk/summary.ts`):

| Metric | Definition |
|--------|------------|
| `currentOpenRisk` | Sum of gross `maxRisk` across all open trades |
| `myOpenRisk` | Sum of `calculateRiskShare(...).myRisk` (personal share) |
| `clientOpenRisk` | Client share of max risk on client trades |
| `totalBuyingPowerUsed` | Sum of `buyingPowerUsed` |

### Risk framework (`lib/risk/calculations.ts`)

```
maximumOptionsCapital = tradingCapital × (maxOptionsAllocationPercent / 100)
availableRiskCapacity = maximumOptionsCapital − myOpenRisk
maximumRiskPerTrade     = availableRiskCapacity × (maxRiskPerTradePercent / 100)
riskUtilizationPct      = myOpenRisk / maximumOptionsCapital × 100
riskZone                = safe (≤60%) | caution (≤75%) | danger (>75%)
```

### Other dashboard sections

| Section | File |
|---------|------|
| Ticker exposure | `lib/risk/ticker-exposure.ts` — concentration ≥15%, duplicate tickers |
| Alerts | `lib/risk/alerts.ts` — computed in-memory, **not persisted** to `alerts` table |
| Single-leg checks | `lib/risk/single-leg-checks.ts` — sell put/call collateral |
| Capital liquidity | `lib/risk/capital-liquidity.ts` — cash/stress test (uses **gross** open risk) |
| Health score | `lib/portfolio/health-score.ts` |

### Settings

**Defaults** — `PROJECT_RULES.md` + `lib/constants/trading-rules.ts`:

| Rule | Value |
|------|-------|
| Take profit | 75% |
| Stop loss | 175% |
| Max options allocation | 75% |
| Max risk per trade | 2.5% of available capacity |

**DB:** `risk_settings` table (one row per user).  
**Runtime read:** loads 3 fields into `RiskSettingsSnapshot` — **`stop_loss_percent` is never read**. Falls back to `TRADING_RULES` when no row / no auth.  
**No write path** — settings page is a placeholder.

---

## 8. Supabase Table Architecture

### Sources of truth

- **Migrations:** `supabase/migrations/` (46 files)
- **Generated types:** `types/database.ts` (29 tables — **stale vs migrations**)
- **Docs:** `lib/database/schema-reference.md` (Phase 1, 13 tables — **very stale**)

### Auth resolution (`lib/supabase/resolve-user.ts`)

| Function | Behavior |
|----------|----------|
| `resolveAuthenticatedUserId()` | Auth session → `SUPABASE_DEV_USER_ID` → `undefined` |
| `requireUserId()` | Unconfigured → `"mock-user"`; configured without auth → throws |
| `resolveUserId()` | Unconfigured → `"mock-user"`; configured without auth → `"mock-user"` |

**Mock read pattern:** `lib/supabase/data-access.ts` → `readSupabasePrimary()` — mock when unconfigured; empty on no user; mock fallback on catch.

### Tables in `types/database.ts` (29)

`portfolio_snapshots`, `daily_portfolio_snapshots`, `holdings`, `portfolio_overrides`, `financial_goals`, `financial_goal_changes`, `monthly_contributions`, `watchlist`, `market_data`, `support_resistance`, `technical_indicators`, `options_trades`, `crypto_holdings`, `stock_etf_holdings`, `dividend_records`, `auto_watchlist_results`, `data_source_logs`, `client_profiles`, `client_trade_allocations`, `trading_journal`, `risk_settings`, `alerts`, `reports`, `weekly_market_updates`, `scanner_scores`

### Tables in migrations but missing from generated types

- `user_settings`
- `portfolio_milestone_thresholds`
- `auto_watchlist_runs`
- `import_export_logs`
- `market_intelligence_documents`
- `market_intelligence_summaries`
- `market_intelligence_ticker_impacts`

### Hub model

`watchlist` is the relational hub for: `market_data`, `support_resistance`, `weekly_market_updates`, `scanner_scores`, `options_trades`, `technical_indicators`, `market_intelligence_ticker_impacts`.

`options_trades` uses direct FK + denormalized `ticker`.

**Not a table:** `ticker_positions` — computed view from `options_trades` + holdings + dividends.

### RLS patterns

**Pattern A — Standard user scope** (most tables):

```sql
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)
```

**Pattern B — Watchlist-scoped children:** `market_data`, `technical_indicators` validate watchlist ownership.

**Pattern C — Strengthened FK validation** (`20260607220300_phase16c_rls_strengthen.sql`): dividend holding_id, client allocations, goal changes, journal trades, options trades watchlist/client, support_resistance watchlist.

**Pattern D — Manual-data protection (triggers):**

| Protected resource | Mechanism |
|--------------------|-----------|
| `portfolio_overrides` | Block writes unless authenticated user or `app.user_initiated` |
| `support_resistance` | Same |
| `daily_portfolio_snapshots` (manual rows) | Block auto-overwrite/delete |
| `dividend_records` (manual override) | Block API overwrite |
| `options_trades` (manual option value) | Preserve on system refresh |

RPC: `upsert_manual_daily_portfolio_snapshot(jsonb)` sets `app.user_initiated` in-transaction.

### Generated columns (daily snapshots)

Post-refinement (`20260608120000_trading_cash_manual_refinement.sql`):

- `trading_cash_sgd = sgd_cash`
- `trading_capital_sgd = us_etf + us_stock + sg_stock + sgd_cash + current_options_value_sgd`
- `total_assets_managed_sgd = portfolio_value_sgd + client_current_value_sgd`

Crypto and client capital excluded from trading capital.

### Full migration timeline (by phase)

| Phase | Tables added |
|-------|-------------|
| Phase 1 core | `portfolio_snapshots`, `holdings`, `financial_goals`, `watchlist`, `market_data`, `support_resistance`, `options_trades`, `trading_journal`, `risk_settings`, `alerts`, `reports`, `weekly_market_updates`, `scanner_scores` |
| Multi-currency | `portfolio_overrides` |
| Trackers | `crypto_holdings`, `stock_etf_holdings` |
| Client sharing | `client_profiles`, `client_trade_allocations` |
| Auto watchlist | `auto_watchlist_results` |
| Market intelligence | MI documents/summaries/impacts |
| Contributions | `monthly_contributions` |
| Daily history | `daily_portfolio_snapshots` |
| Dividends | `dividend_records` |
| Goals audit | `financial_goal_changes` |
| Data health | `data_source_logs` |
| Phase 16C | `user_settings`, `technical_indicators`, `portfolio_milestone_thresholds`, `auto_watchlist_runs`, `import_export_logs` |

---

## 9. Current Blockers

### Authentication & local development

- Auth **not fully wired** for all flows — dev bypass via `SUPABASE_DEV_USER_ID` (must be real `auth.users` UUID for RLS).
- Without auth + configured Supabase: many reads return **empty** via `readSupabasePrimary.empty`; dashboards may show sparse data.
- CRUD throws `NotAuthenticatedError` via `requireUserId()`.
- Passing `"mock-user"` to UUID columns causes Postgres errors (partially fixed in `data-source-logs.ts`).

### Mock mode fallbacks

| Area | Behavior |
|------|----------|
| Central pattern | `readSupabasePrimary()` — unconfigured → mock; catch → mock |
| Reference date | `MOCK_REFERENCE_DATE = "2026-06-06"` used for SSR-safe calcs everywhere |
| 32+ mock modules | `lib/mock/*` — in-memory stores for most features |
| Data health badge | Shows mock vs live based on portfolio `dataSource` only |

### Unwired / placeholder features

| Feature | Status |
|---------|--------|
| Settings page | Placeholder — no `user_settings` or `risk_settings` CRUD |
| `risk_settings` writes | Read-only; no seed on signup; `stop_loss_percent` never loaded |
| `reports` table | No query usage |
| `portfolio_milestone_thresholds` | Migration exists; UI still uses **localStorage** |
| `user_settings`, `import_export_logs`, `auto_watchlist_runs` | Migrations only — no TS query layer |
| Live OHLCV sync | Data health: "FMP (OHLCV sync not wired)" |
| Technical indicators pipeline | DB table exists; scanner uses mock fixtures |
| Auto-watchlist market cap API | TODO in `market-data-service.ts` |
| Equity curve | `EquityCurvePlaceholder.tsx` |
| Portfolio refresh button | No handler wired |
| FMP dividend calendar | Exists but never called by sync |
| Data source sync logging | `appendDataSourceLog` exists but dividend/market syncs don't call it |

### Data integrity blockers

| Issue | Impact |
|-------|--------|
| Dividend sync duplicates | No UNIQUE on `(user_id, api_reference_id)`; each sync assigns new UUID |
| Historical share count in sync | Uses current shares for all historical dividend events |
| Currency mismatch in passive income | USD premiums/dividends + SGD dividends summed without FX for SGD targets |
| `sgd_equivalent` stored but unused | Aggregations use native `net_dividend` |
| Three goal systems not unified | DB goals vs hardcoded milestones vs legacy projection can disagree |
| `types/database.ts` stale | 7+ tables missing from generated types |
| `schema-reference.md` stale | Documents 13 of ~34 tables |

### Schema / migration drift

- `usd_cash_sgd_equivalent` deprecated in app (writes 0) but column retained
- Older migration `20260607220600` had different `trading_cash_sgd` formula — superseded by `20260608120000`
- RPC `upsert_manual_daily_portfolio_snapshot` not in generated types (`Functions: Record<string, never>`)

---

## 10. Logic Conflicts with Intended Rules

Reference: [`PROJECT_RULES.md`](./PROJECT_RULES.md)

### Support & resistance — manual only ✅ (well enforced)

**Rules 1–3:** Never auto-generate S/R.

Enforcement:

- SQL triggers block system writes on `support_resistance`
- Scoring returns `"Manual support required — never auto-generated"`
- UI copy across watchlist, risk, journal, alerts
- `market_data` and `technical_indicators` do not write S/R

### Primary strategies — partial conflict

**Rule 4:** Bull Put, Bear Call, Iron Condor are primary.

Risk dashboard `openRiskByStrategy` includes `sell_put` and `sell_call` in strategy keys. Extended strategies tracked but not designated primary.

### Trade management rules — settings drift ⚠️

**Rules 5–8:** TP 75%, SL 175%, max allocation 75%, max risk per trade 2.5%.

| Location | Conflict |
|----------|----------|
| `lib/risk/alerts.ts` | `allocation_exceeded` uses constant, not user `settings.maxOptionsAllocationPercent` |
| `components/risk/RiskSummaryCards.tsx` | Hardcodes "Max 75%" |
| `lib/portfolio/health-score.ts` | Uses `TRADING_RULES` constant, not DB settings |
| `risk_settings.stop_loss_percent` | Stored in DB, never loaded; per-trade `stop_loss_target` used instead |
| `lib/risk/alerts.ts` | No portfolio-level 175% stop-loss alert |

Rules say defaults are "stored in `risk_settings` and enforced" — enforcement is inconsistent with DB-loaded settings.

### Open risk basis inconsistency ⚠️

| Metric | Uses |
|--------|------|
| Utilization / max per trade / available capacity | **`myOpenRisk`** (personal share) |
| `currentOpenRisk` summary card | **Gross** max risk |
| Capital liquidity | **Gross** open risk |
| `usdTradingBuyingPower` | **Gross** open risk subtracted from USD cash |
| Portfolio current state grid "My portfolio exposure" label | Shows **gross** `totalOpenRisk` while capacity uses `myOpenRisk` |

### Trading capital vs portfolio value divergence ⚠️

- Base layer `buildPortfolioMetrics` sets `tradingCapital = portfolioValue` until enrichment.
- Reconciliation buckets (holdings aggregate) vs capital pools (tracker-specific values + personal options MTM) can diverge.
- Client open positions excluded from `optionsValueSgd` but their gross risk appears in `totalOpenRisk`.

### Client capital separation ⚠️

Correctly excluded from My Portfolio Value and trading capital denominator. However, **`currentOpenRisk` includes client trade gross risk** before split display.

### Cash rules ⚠️

App layer: USD cash reference-only, trading capital uses SGD only.  
DB snapshots aligned post-refinement. Risk liquidity still subtracts gross open risk from USD reference cash.

### Dividend / goals currency ⚠️

Passive income goal targets are SGD but computation mixes USD (US premiums/dividends) with SGD (SG dividends) without FX normalization.

### Dual alert systems ⚠️

- `lib/risk/alerts.ts` — ephemeral, computed at render
- `alerts` table — persisted, used by Alerts Center

Risk dashboard alerts never written to Supabase.

### One trade per ticker ⚠️

Duplicate ticker exposure generates danger alert but enforcement is only at trade creation (`app/actions/trades.ts`), not in risk layer.

### Computed vs enriched metrics ⚠️

Any consumer of `getPortfolioDashboardData()` without `getEnrichedPortfolioMetrics()` gets wrong capital split, cash pools, and client metrics.

---

## Appendix A — Key Function Index

### Portfolio
- `getEnrichedPortfolioMetrics` — `lib/portfolio/enrich-capital-pools.ts`
- `buildCapitalPoolsBreakdown` — `lib/portfolio/capital-pools.ts`
- `buildPortfolioMetrics` — `lib/portfolio/calculations.ts`
- `buildPortfolioCurrentState` — `lib/portfolio/current-state.ts`
- `upsertDailyPortfolioSnapshot` — `lib/supabase/queries/daily-portfolio-snapshots.ts`

### Client capital
- `buildClientCapitalMetrics` — `lib/portfolio/client-capital.ts`
- `buildClientProfitSharingSummary` — `lib/client-profit-sharing/calculations.ts`
- `calculateRiskShare` — `lib/trades/pnl-allocation.ts`

### Dividends
- `syncDividendsForUser` — `lib/dividends/sync-dividends.ts`
- `buildDividendPortfolioSummary` — `lib/dividends/calculations.ts`
- `getDividendTrackerData` — `lib/supabase/queries/dividend-records.ts`

### Goals
- `getFinancialGoalsData` — `lib/supabase/queries/goals.ts`
- `resolveLiveMetrics` — `lib/supabase/queries/financial-goals.ts`
- `computePassiveIncomeMonthlySgd` — `lib/goals/resolve-current-value.ts`
- `buildGoalsDashboardData` — `lib/goals/calculations.ts`

### Risk
- `buildRiskDashboardData` — `lib/risk/summary.ts`
- `buildRiskFramework` — `lib/risk/calculations.ts`
- `buildTradeCalculations` — `lib/trades/calculations.ts`

---

## Appendix B — Application Routes

| Route | Feature |
|-------|---------|
| `/` | Portfolio dashboard |
| `/trades` | Options trade tracker |
| `/ticker-positions` | Aggregated ticker positions |
| `/stocks` | Stock & ETF tracker |
| `/crypto` | Crypto tracker |
| `/dividends` | Dividend tracker |
| `/goals` | Financial goals |
| `/risk` | Risk dashboard |
| `/watchlist` | Watchlist scanner |
| `/auto-watchlist` | Auto watchlist screener |
| `/client-profit-sharing` | Client profit sharing |
| `/journal` | Trading journal |
| `/alerts` | Alerts center |
| `/data-health` | Data source health check |
| `/weekend-review` | Weekend market review |
| `/weekend-ranking` | Weekend ranking |
| `/market-intelligence` | Market intelligence |
| `/import-export` | Import/export |
| `/reports` | Reports |
| `/trade-queue` | Trade queue |
| `/settings` | Settings (placeholder) |

---

## Appendix C — Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_DEV_USER_ID` | Dev bypass UUID for RLS when auth not wired |
| `FMP_API_KEY` | FMP market data + dividends |
| `ALPHA_VANTAGE_API_KEY` | Dividend fallback |
| `MARKET_DATA_API_KEY` | Market data API (configured check only; OHLCV sync not wired) |

---

## Appendix D — Test Coverage (capital & risk formulas)

| Test file | Validates |
|-----------|-----------|
| `lib/portfolio/capital-pools.test.ts` | Trading cash, manual override, crypto split, full pool math |
| `lib/portfolio/client-capital.test.ts` | Client NAV, return %, AUM |
| `lib/portfolio/reconciliation.test.ts` | Reconciliation buckets, manual override |
| `lib/risk/capital-liquidity.test.ts` | Liquidity formulas |
| `lib/risk/calculations.test.ts` | Risk framework math |
| `lib/client-profit-sharing/calculations.test.ts` | Profit split logic |

---

*End of project knowledge document.*
