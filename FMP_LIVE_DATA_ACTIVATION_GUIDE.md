# FMP Live Data Activation Guide

**Date:** 2026-06-08  
**Goal:** Activate live FMP market data for the Watchlist Scanner with your actual trading universe.

---

## Current status (before activation)

| Component | Status |
|-----------|--------|
| Active watchlist detection | Working |
| Scanner health cards | Synchronized |
| Technical indicator pipeline | Operational |
| Live OHLCV in `market_data` | **Blocked — needs `FMP_API_KEY` + refresh** |

---

## 1. FMP integration reference

### Environment variable

| Variable | Location | Notes |
|----------|----------|-------|
| **`FMP_API_KEY`** | `.env.local` (dev) / Vercel env (prod) | Server-only — never `NEXT_PUBLIC_` |

### Endpoint

```
GET https://financialmodelingprep.com/stable/historical-price-eod/full
```

Query params: `symbol`, `from`, `to`, `apikey`

Implemented in: `lib/watchlist/market-data-provider.ts`

### Subscription plan

| Tier | Suitability |
|------|-------------|
| **Free** | Dev / ≤10 tickers, ~250 calls/day, ~5 years history |
| **Starter ($22/mo)** | Production daily refresh + dividends |
| **Premium ($59/mo)** | Larger watchlists, 750 calls/min |

This app fetches **1 call per active ticker per refresh** (not per candle row).

### Rate limits (FMP published)

| Plan | Daily calls | Bandwidth (30-day trailing) |
|------|-------------|----------------------------|
| Free | 250 | 500 MB |
| Starter | Higher | 20 GB |

Quota header (when provided): `X-RateLimit-Remaining` — surfaced on Data Health FMP card and `/api/test-fmp`.

### Symbol format

- **Uppercase US tickers** — e.g. `QQQ`, `NVDA`, `GOOG`
- Passed as `symbol=QQQ` to FMP stable EOD endpoint
- No exchange prefix required for US listings

### Symbol support (your universe)

| Symbol | Type | FMP EOD expected |
|--------|------|------------------|
| **QQQ** | US ETF | Yes |
| **IWM** | US ETF | Yes |
| **GLD** | US ETF | Yes |
| **NVDA** | US stock | Yes |
| **XSP** | Canadian ETF (TSX) | **May fail** — try `XSP.TO` if empty; monitor Data Health failed tickers |
| **JPM, XOM, AVGO, META, GOOG, AMZN, MSFT** | US stocks | Yes |

---

## 2. Your trading watchlist (defaults)

Updated in `lib/watchlist/categories.ts`:

| Category | Tickers |
|----------|---------|
| **ETF** | XSP, QQQ, IWM, GLD |
| **Top 7 (Mega Cap / Growth)** | NVDA, AVGO, META, GOOG, AMZN, MSFT |
| **Sector Leader** | JPM, XOM |

**12 active default tickers** (Pullbacks category remains empty for manual adds).

### Sync behavior

`ensureDefaultWatchlistItems()` runs on:

- Data Health page load
- **Refresh Market Data**
- **Refresh Technical Indicators**

Rules:

- Adds missing tickers only — **no duplicates**
- Reactivates inactive default tickers
- **Never writes support/resistance** — manual S/R preserved
- Market data refresh **never touches** `support_resistance`

---

## 3. FMP test endpoint

```
GET /api/test-fmp
```

### Example (local)

```powershell
Invoke-RestMethod http://localhost:3000/api/test-fmp | ConvertTo-Json -Depth 5
```

### Response fields

| Field | Description |
|-------|-------------|
| `apiReachable` | HTTP connection to FMP succeeded |
| `apiKeyConfigured` | `FMP_API_KEY` present |
| `connectionStatus` | `connected`, `missing_api_key`, `invalid_key`, `rate_limited`, `no_data_returned`, `symbol_unsupported` |
| `remainingQuota` | From FMP header if available |
| `completedCandleTarget` | Latest completed NYSE session date |
| `symbols[]` | QQQ, GLD, XSP, IWM, NVDA — each with `candleDate`, `high`, `low`, `averagePrice`, `error` |

---

## 4. Data Health diagnostics

New **FMP Market Data** card on `/data-health`:

| Field | Description |
|-------|-------------|
| FMP Status | Connected / Missing API Key / Invalid Key / Rate Limited / No Data Returned / Symbol Unsupported |
| Active Tickers | Count from `watchlist` (`is_active = true`) |
| Tickers Updated | Distinct watchlist IDs with OHLCV in `market_data` |
| Failed / Stale Tickers | From scanner health (stale candles + missing indicators) |
| Last Successful Refresh | From `data_source_logs` |
| Latest Completed Candle | Max `price_date` in `market_data` |

---

## 5. Completed daily candle rule

Enforced in:

- `lib/market-calendar/nyse-calendar.ts` — `lastCompletedTradingDate()`
- `lib/watchlist/sync-watchlist-data.ts` — filters `c.date <= completedCandleDate`
- `lib/watchlist/fmp-diagnostics.ts` — test endpoint uses completed date only

**Never used:**

- Live price
- Intraday bars
- Partial current-day candle
- Pre-market / after-hours

`to` parameter on FMP fetch = last completed NYSE session (16:00 ET guard).

---

## 6. Indicator pipeline

After OHLCV upsert to `market_data`:

| Output | Formula / source |
|--------|------------------|
| **Average Price** | `(High + Low) / 2` — **primary scanner reference** |
| EMA20 | Computed from completed daily closes |
| SMA50 | Computed |
| SMA200 | Requires 200+ history bars |
| ATR14 | Computed |
| Stochastic | 14-period |

Stored in `technical_indicators`. Scanner scoring uses **Average Price**, not Close.

---

## 7. Activation steps

### Step 1 — Configure environment

`.env.local`:

```env
FMP_API_KEY=your_key_here
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_DEV_USER_ID=your-user-uuid
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Restart: `npm run dev`

### Step 2 — Verify FMP

```powershell
Invoke-RestMethod http://localhost:3000/api/test-fmp
```

Expect `connectionStatus: "connected"` and populated `symbols` for QQQ, IWM, NVDA, GLD.

### Step 3 — Open Data Health

`/data-health`

- Confirm **12 active tickers** (after default sync)
- FMP card shows **Connected** (after key configured)

### Step 4 — Refresh data

1. Click **Refresh Market Data**
2. Click **Refresh Technical Indicators**

### Step 5 — Expected results

| Check | Expected |
|-------|----------|
| Last Candle Date | Completed NYSE session (e.g. prior trading day before 4pm ET) |
| Indicators Updated | **Yes** (12/12 or your active count) |
| Scanner Ready | **Green / Ready** |
| `market_data` | Rows with `source = fmp` |
| `technical_indicators` | Rows for completed candle date |
| Scanner scores | Updated on `/watchlist` |

### Step 6 — Troubleshooting

| Issue | Action |
|-------|--------|
| Missing API Key | Add `FMP_API_KEY`, restart |
| Invalid Key | Regenerate at [FMP dashboard](https://site.financialmodelingprep.com/) |
| XSP fails | Expected if FMP lacks TSX symbol — other tickers should succeed |
| 0 OHLCV after refresh | Check Data Source Log errors; verify dev service-role env vars |
| Partial refresh | Review failed tickers on FMP card |

---

## 8. Files added / changed

| File | Purpose |
|------|---------|
| `lib/watchlist/categories.ts` | Trading universe defaults |
| `lib/watchlist/ensure-default-watchlist.ts` | Sync defaults to Supabase |
| `lib/watchlist/fmp-diagnostics.ts` | FMP probe + symbol tests |
| `lib/watchlist/market-data-provider.ts` | FMP endpoint + error parsing |
| `lib/data-health/fmp-status.ts` | Data Health FMP diagnostics |
| `components/data-health/FmpHealthCard.tsx` | FMP UI card |
| `app/api/test-fmp/route.ts` | Test endpoint |
| `lib/watchlist/sync-watchlist-data.ts` | Service-role aware Supabase client |

---

## Stop

Activation guide complete. Configure `FMP_API_KEY`, run `/api/test-fmp`, then refresh from Data Health.
