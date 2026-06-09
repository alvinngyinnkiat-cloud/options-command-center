# Watchlist Scanner — Daily Candle Data Audit

**Date:** 2026-06-09  
**Scope:** Read-only audit — no code changes  
**Goal:** Assess readiness for Watchlist Scanner as primary trade selection tool

---

## Executive Summary

| Area | Status | Notes |
|------|--------|-------|
| Average Price as primary reference | **PASS** | Scoring uses `(High + Low) / 2` throughout |
| Scoring excludes Close / DTE / Delta / Premium / Volume | **PASS** | Not used in score engine |
| Manual S/R only | **PASS** | Enforced in scoring + schema comments |
| Required scanner fields (data model) | **PARTIAL** | Fields exist; UI split across views |
| Completed daily candle only | **FAIL** | No market-close or incomplete-candle guard |
| Live OHLCV ingestion | **FAIL** | No API sync; refresh buttons re-read DB/mock |
| Indicator computation from candles | **FAIL** | Indicators read from DB or mock fixtures |
| Post-close automation | **FAIL** | No scheduled job after US market close |
| Weekly S/R levels | **GAP** | Schema supports timeframe; scanner loads daily only |

**Verdict:** Scoring logic and Average Price architecture are largely aligned with your trading rules. The **data pipeline** (completed-candle selection, OHLCV fetch, indicator calculation, post-close automation) is **not production-ready** for primary trade selection.

---

## Core Data Rule — Completed Daily Candle Only

### Requirement

On 2026-06-09 before US close → use **2026-06-08** completed daily candle.  
Must NOT use live price, pre/after-hours, intraday, or partial daily bars.

### Current Behaviour

**File:** `lib/supabase/queries/watchlist-scanner.ts` → `buildRowFromDb()`

```typescript
const sorted = [...marketRows].sort(
  (a, b) => new Date(b.price_date).getTime() - new Date(a.price_date).getTime()
);
const latest = sorted[0];  // ← most recent row by calendar date
```

| Check | Result |
|-------|--------|
| Selects latest `price_date` from `market_data` | Yes |
| Excludes today if US market not closed | **No** |
| Timezone / session awareness (NYSE close) | **No** |
| Rejects intraday or partial bars | **No** — assumes stored row is full daily OHLC |
| Live quote API | **No** — reads Supabase `market_data` only |

**Gap:** If today's date exists in `market_data` (manual entry, partial sync, or same-day row), the scanner will use it regardless of market status.

**Mock path:** `lib/mock/watchlist-scanner.ts` uses fixed `MOCK_REFERENCE_DATE` — no session logic there either.

---

## Primary Price Reference — Average Price

### Requirement

```
Average Price = (High + Low) ÷ 2
```

Not Close vs EMA/SMA.

### Current Behaviour — **PASS**

| Location | Implementation |
|----------|----------------|
| `lib/watchlist/average-price.ts` | `calculateAveragePrice(high, low)` |
| `lib/watchlist/calculations.ts` | `buildMarketDataFields()` sets `averagePrice` from H/L |
| `lib/watchlist/scoring/map-row.ts` | Comment + code: scoring uses `row.market.averagePrice` |
| `lib/watchlist/scoring/map-row.test.ts` | Asserts S/R score differs when currentPrice ≠ averagePrice |

**Display-only close usage (not scoring):**

- `market.currentPrice` defaults to `close` in `buildMarketDataFields()`
- `dailyChangePct` = change from `currentPrice` vs `previousClose` — UI metric only
- `WatchlistTable` shows Current, Close, Prev Close, Chg% — reference columns

Scoring engine does **not** call Close for EMA/SMA/trend/S/R.

---

## Data Required From Completed Daily Candle

### Required inputs

| Field | Stored | Used in scoring |
|-------|--------|---------------|
| High | `market_data.high` → `row.market.high` | Yes (via Average Price) |
| Low | `market_data.low` → `row.market.low` | Yes (via Average Price) |
| Open | `market_data.open` | Reference only |
| Close | `market_data.close` | Reference only (+ display) |
| EMA20 | `technical_indicators.ema_20` | Yes (distance from Average Price) |
| SMA50 | `technical_indicators.sma_50` | Yes (trend + direction) |
| SMA200 | `technical_indicators.sma_200` | Yes (trend) |
| ATR14 | `technical_indicators.atr_14` | Yes (S/R distance) |
| Stochastic | `technical_indicators.stochastic` | Yes |

### Indicator source — **GAP**

**File:** `lib/supabase/queries/watchlist-scanner.ts` → `resolveTechnicals()`

1. Reads `technical_indicators` ordered by `indicator_date DESC`
2. If missing → `getMockTechnicalSnapshot(ticker)` from mock fixtures

**There is no code that:**

- Fetches historical daily candles from an external provider
- Computes EMA20 / SMA50 / SMA200 / ATR14 / Stochastic from OHLC series
- Persists computed indicators back to `technical_indicators`

Data Health audit confirms this explicitly:

> *"Mock technical fixtures (live indicator pipeline not wired)"*  
> — `lib/data-health/audit-sources.ts`

---

## Trading Rules Compliance

### Support & Resistance — **PASS**

| Rule | Status | Evidence |
|------|--------|----------|
| Manual only | Pass | `ManualSupportResistance` type comment; S/R editor UI |
| Never auto-generate | Pass | `scoreSupportResistance()` returns 0 if support/resistance null |
| Never overwrite manual | Pass | No S/R writes in market/indicator refresh paths |
| Major Daily and Weekly | **Partial** | DB has `timeframe`; scanner query filters `timeframe = 'daily'` only |

**File:** `lib/watchlist/scoring/support-resistance.ts`

- Bull Put: `(averagePrice - support) / atr14`
- Bear Call: `(resistance - averagePrice) / atr14`
- Iron Condor: `(resistance - support) / atr14`

### DTE / Delta / Premium / Volume — **PASS (excluded)**

| Field | In scanner scoring? |
|-------|---------------------|
| DTE | No |
| Delta | No |
| Premium | No — `recommendation.test.ts` asserts Premium not in breakdown |
| Volume | No — `market_data.volume` exists in schema but unused in scanner |

Volume is listed in Data Health as a market_data field but never read by watchlist scoring.

---

## Scanner Scoring Audit

### Score components (`lib/watchlist/scoring/compute.ts`)

| Component | Weight | Input price basis | Status |
|-----------|--------|-------------------|--------|
| Trend | 35 | Average Price vs SMA50/SMA200 | Pass |
| Stochastic | 20 | SO value (not Close) | Pass |
| EMA20 | 20 | Average Price distance to EMA20 | Pass |
| Support/Resistance | 25 | Average Price + ATR + manual S/R | Pass |

### Verified scoring inputs

| Required | Used? | File |
|----------|-------|------|
| Average Price vs EMA20 | Yes | `scoring/ema20.ts`, `map-row.ts` |
| Average Price vs SMA50 | Yes | `scoring/trend.ts`, `scoring/candidate.ts` |
| Average Price vs SMA200 | Yes | `scoring/trend.ts` |
| ATR positioning | Yes | `scoring/support-resistance.ts` |
| Stochastic positioning | Yes | `scoring/stochastic.ts` |
| Distance from Manual Support | Yes | `scoring/support-resistance.ts` |
| Distance from Manual Resistance | Yes | `scoring/support-resistance.ts` |

### Verified NOT used in scoring

| Excluded | Confirmed |
|----------|-----------|
| Close price | Yes — test in `map-row.test.ts` |
| DTE | Yes |
| Delta | Yes |
| Premium | Yes |
| Volume | Yes |

### Extra layer (not in your spec)

**Market Intelligence combined score** — `map-row.ts` merges scanner score with intelligence impact (`combinedScore`). This is additive UI/ranking metadata, not part of the four core score components.

---

## Scanner Fields — UI vs Required

### Required fields

| Field | In data model | Visible in UI |
|-------|---------------|---------------|
| Ticker | Yes | All views |
| Daily High | Yes (`market.high`) | `WatchlistTable` detailed view |
| Daily Low | Yes (`market.low`) | `WatchlistTable` detailed view |
| Average Price | Yes | Table + expanded analysis row |
| EMA20 | Yes | Table + expanded row |
| SMA50 | Yes | Table + expanded row |
| SMA200 | Yes | Table + expanded row |
| ATR14 | Yes | Table + expanded row |
| Stochastic | Yes | Table + expanded row |
| Manual Support | Yes (`support1`) | Table S1 + expanded row |
| Manual Resistance | Yes (`support1`) | Table R1 + expanded row |
| Scanner Score | Yes | Table + category views |

### Optional reference

| Field | Status |
|-------|--------|
| Open | Shown in `WatchlistTable` |
| Close | Shown in `WatchlistTable` + used for display metrics |

### View fragmentation

- **Trading Analysis grid** (`TradingAnalysisScannerGrid`) — compact: Ticker, Strategy, Action; details on expand
- **WatchlistTable** — full column set including High, Low, Avg, indicators, S/R, scores
- **WatchlistCategoryTable** — category-grouped analysis view

Primary trade-selection UI may need a **single consolidated scanner table** with all required fields visible without expanding rows.

---

## Automation Requirement — Post US Close Update

### Requirement

After US market close, automatically update High, Low, Average Price, EMA20, SMA50, SMA200, ATR14, Stochastic from latest **completed** daily candle. Manual S/R unchanged.

### Current Behaviour — **FAIL**

| Action | What it actually does |
|--------|----------------------|
| `refreshMarketDataHealth()` | Calls `getWatchlistScannerData()` — **re-reads existing data**, logs success |
| `refreshTechnicalIndicatorsHealth()` | Same — **re-scores from existing data**, no fetch/compute |

**No code found for:**

- External OHLCV API fetch (FMP key referenced in audit but "OHLCV sync not wired")
- `market_data` INSERT/UPSERT
- `technical_indicators` INSERT/UPSERT
- Cron / scheduled job / edge function for post-close refresh
- Market calendar (NYSE holidays, early close)

**Schema readiness:**

- `market_data` — one row per `(watchlist_id, price_date)` with OHLCV columns
- `technical_indicators` — one row per `(watchlist_id, indicator_date)` with indicator columns
- Tables exist; **pipelines do not**

---

## Recommended Architecture vs Current State

```
                    REQUIRED                         CURRENT
                    --------                         -------
Manual              Support, Resistance              SupportResistanceEditor → DB ✓
                    (Daily + Weekly)                 Daily only in scanner query ⚠

Automatic           Daily High, Low                  From market_data IF populated ⚠
                    Average Price                    Computed from H/L ✓
                    EMA20, SMA50, SMA200             DB or mock — not from candles ✗
                    ATR14, Stochastic                DB or mock — not from candles ✗

Scoring             Average Price based              Average Price based ✓

Automation          Post-close daily refresh         Manual/mock only ✗
                    Completed candle guard           Latest date only ✗
```

---

## Key Files Reference

| Purpose | Path |
|---------|------|
| Row assembly + DB read | `lib/supabase/queries/watchlist-scanner.ts` |
| Average Price calc | `lib/watchlist/average-price.ts` |
| Score engine | `lib/watchlist/scoring/compute.ts` |
| Score attachment | `lib/watchlist/scoring/map-row.ts` |
| Trend / EMA / SO / S/R | `lib/watchlist/scoring/trend.ts`, `ema20.ts`, `stochastic.ts`, `support-resistance.ts` |
| Recommendations | `lib/watchlist/recommendation/compute.ts` |
| Data Health truth | `lib/data-health/audit-sources.ts` |
| Refresh actions (no fetch) | `app/actions/data-health.ts` |
| Full field UI | `components/watchlist/WatchlistTable.tsx` |
| Compact analysis UI | `components/watchlist/TradingAnalysisScannerGrid.tsx` |
| Schema | `supabase/migrations/20260606120003_goals_watchlist_market_data.sql` |
| Indicators schema | `supabase/migrations/20260607220000_phase16c_new_tables.sql` |

---

## Gap Summary — Implementation Backlog (Not Done)

Priority order for making scanner production-ready:

1. **Completed-candle selector** — Given date/time + US market calendar, resolve `lastCompletedTradingDate`; never use today's bar until session closed.
2. **OHLCV ingestion pipeline** — Fetch daily bars for watchlist tickers; upsert `market_data` for completed date only.
3. **Indicator computation pipeline** — From historical daily candles, compute EMA20, SMA50, SMA200, ATR14, Stochastic; upsert `technical_indicators`.
4. **Post-close automation** — Scheduled job (cron/edge function) after NYSE close; trigger pipelines; re-score and persist `scanner_scores`.
5. **Weekly S/R support** — Load or toggle daily vs weekly manual levels per PROJECT_RULES §10.
6. **UI consolidation** — Primary scanner view with all required fields on one row for trade selection.
7. **Remove display ambiguity** — Label `currentPrice` as reference-only or hide from primary scanner; emphasize High/Low/Avg.

---

## Verification

```bash
npm run build   # Pass (2026-06-09 audit run)
```

No code was modified for this audit.

---

## Conclusion

The **scoring philosophy** (Average Price, manual S/R, no options greeks/volume) is **already implemented correctly** in `lib/watchlist/scoring/`.  

The **data foundation** required for reliable daily trade selection is **not yet implemented**: there is no completed-candle guard, no live OHLCV sync, no indicator calculation from candles, and no post-close automation. Until those pipelines exist, the scanner runs on **stored or mock data** and cannot guarantee it reflects the most recently **completed** US daily session.

**Stop — awaiting implementation direction.**
