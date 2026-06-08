# Investment Manager — Project Rules

> **Permanent rules for all development phases.**  
> Future agents MUST read this file before implementing features, schema changes, or business logic.  
> See also [`PROJECT_KNOWLEDGE.md`](./PROJECT_KNOWLEDGE.md) for architecture audit and implementation map.

---

## Project Purpose

A web-based dashboard for Portfolio, Financial Goals, Stock/ETF, Crypto, Options Trading, Risk, Dividend, Client Profit Sharing, Watchlist, and Reports.

**Current stage:** Supabase project created; migrations applied and synced; Phase 16D frontend-to-Supabase integration in progress.

---

## 1. My Portfolio Value

- Excludes client capital.
- Excludes client current value.
- Used for Financial Goals, CAGR, portfolio history, milestones, and personal net worth.

```
My Portfolio Value = Trading Capital + Crypto Capital
```

Implementation: `lib/portfolio/capital-pools.ts` → `buildCapitalPoolsBreakdown()`.

---

## 2. Client Current Value

- Tracked separately from personal net worth.
- Used only for Client Dashboard and Total Assets Managed.
- Must **not** affect my goals or my portfolio performance.

Implementation: `lib/portfolio/client-capital.ts` → `buildClientCapitalMetrics()`.

---

## 3. Total Assets Managed

- `My Portfolio Value + Client Current Value`.
- Informational only — not used for goals, CAGR, or milestones.
- Database-generated column on `daily_portfolio_snapshots`, not manually entered.

---

## 4. Trading Cash

- **Trading Cash SGD** is manually entered and used for all dashboard and risk calculations.
- **Trading Cash USD** is manually entered but **reference only** (US stocks/options context).
- **No automatic FX conversion** — USD cash is never added to SGD trading cash or Trading Capital.

Implementation: `portfolio_overrides.manual_trading_cash_sgd`, `manual_trading_cash_usd`; `resolveTradingCash()` in `lib/portfolio/capital-pools.ts`.

---

## 5. Crypto Cash

- Crypto Cash SGD is separate from Trading Cash.
- Used only for crypto tracking and crypto buying power.
- Excluded from Trading Capital and stock/options buying power.

Implementation: `splitCryptoTrackerValues()` in `lib/portfolio/capital-pools.ts`.

---

## 6. Trading Capital

Used for stocks and options trading. **Excludes:**

- Crypto holdings
- Crypto cash
- Client value
- USD broker cash (reference only)

```
Trading Capital = US ETFs + US Stocks + SG Stocks + Trading Cash SGD + personal options mark-to-market
```

Options risk and allocation use **Trading Capital only** — not full portfolio value, not crypto.

---

## 7. Options Risk

- **Max options allocation = 75% of Trading Capital** (risk budget ceiling).
- Available risk capacity = ceiling minus current open risk (personal share).
- **Cash availability uses Trading Cash SGD only.**
- **One trade per ticker** rule must be respected (enforced at trade creation; flagged on risk dashboard).

Default per-trade limit: **2.5% of available risk capacity** (see `lib/constants/trading-rules.ts`).

---

## 8. Dividend Tracker

- **Dividend Tracker (`dividend_records`) is the single source of truth** for dividend income.
- Stock & ETF Tracker, Ticker Position Manager, Portfolio Dashboard, Financial Goals, and Reports must read dividend values from Dividend Tracker — not legacy holding columns.
- **Dividends reduce adjusted cost basis** in ticker position calculations.

Implementation: `lib/dividends/calculations.ts` → `buildDividendPortfolioSummary()`.

---

## 9. Options Trade Tracker

- **Current Option Value is manually editable.**
- **Current Option Value drives P/L.**
- **Stop loss is removed** (no portfolio-level stop-loss enforcement on open trades).
- **Take Profit Close Price** = `max(0.01, premium received × 0.25 − 0.01)` (75% profit target on premium).
- Summary view must **not require horizontal scrolling**.
- Summary columns: Underlying, Strategy, DTE, Current Option Value, P/L %, TP Price, Breakeven Distance %, Status.

---

## 10. Support and Resistance

- **Manual only.**
- **Never auto-generate.**
- Auto-refresh and market data pipelines must **never overwrite** manual S/R.
- Use major Daily and Weekly support/resistance only.

Enforced by SQL triggers on `support_resistance` and scoring rules in `lib/watchlist/scoring/`.

---

## 11. Portfolio History

- **`daily_portfolio_snapshots` is the source of truth** for portfolio history.
- Portfolio History belongs under **Financial Goals**.
- Default filter = **7D**.
- Sort **newest to oldest**.
- Use **My Portfolio Value only** — exclude client capital.

---

## 12. Monthly Contributions

- Belongs under **Financial Goals**.
- Only two contribution categories:
  - **Stocks & Options**
  - **Crypto**

---

## 13. Watchlist Scanner

Categories:

- **ETF**
- **Sector Leader**
- **Top 7**
- **Pullbacks**

---

## 14. Stock & ETF Tracker

Separate tabs:

- **US ETF**
- **US Stock**
- **SG Stock**

Income rules:

- US ETF and US Stock: options income **and** dividend income.
- SG Stock: dividend income **only** — no options income.

---

## 15. Client Profit Sharing

- Client P/L is always separate from personal P/L.
- Personal dashboard uses **My P/L only**.
- Client trades only contribute **my share** to my performance metrics.

Implementation: `lib/trades/pnl-allocation.ts` → `calculateMyPnL`, `calculateRiskShare`.

---

## Primary Strategies

Bull Put, Bear Call, and Iron Condor are the **primary** strategies. All trade tracking, scoring, and reporting should center on these three spread types.

---

## Default Watchlist

New users should be seeded with:

```
XSP, SPY, QQQ, IWM, GLD
JPM, CAT, WMT, UNH, XOM, HD
AAPL, MSFT, NVDA, AVGO, AMZN, META, GOOG
```

Unless they customize it.

---

## Phase Reference

| Phase | Scope |
|-------|-------|
| Phase 0 | Dashboard shell (complete) |
| Phase 1 | Supabase database architecture (complete) |
| Phase 16D | Frontend-to-Supabase integration (in progress) |
| Phase 2+ | Feature UI and logic — must comply with all rules above |

---

## Known Implementation Notes

- **`risk_settings` table** stores TP/allocation defaults; UI settings page not yet wired.
- **`data_source_logs`** — empty table must not crash the app; queries return `[]` safely; widget shows "No data health logs yet".
- **Auth:** local dev may use `SUPABASE_DEV_USER_ID` (must be a real `auth.users` UUID for RLS).
- **Mock mode:** when Supabase is unconfigured, `lib/mock/*` provides in-memory data.

When in doubt, read this file first.
