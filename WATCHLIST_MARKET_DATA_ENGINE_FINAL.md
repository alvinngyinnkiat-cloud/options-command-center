# Watchlist Market Data Engine — Final

Production-ready FMP-first market data pipeline with Yahoo Finance fallback for the Watchlist Scanner.

---

## Architecture

```
Active ticker
    │
    ▼
Try FMP (if FMP_API_KEY set)
    │ success → source = "fmp"
    │ recoverable failure → continue
    ▼
Try Yahoo Finance
    │ success → source = "yahoo"
    │ failure → ticker marked failed (both errors recorded)
    ▼
Upsert market_data + compute indicators + rebuild scanner scores
```

### Recoverable FMP failures → Yahoo fallback

- HTTP 402 / 403 / 429
- Premium endpoint message
- Invalid JSON body
- Empty / no data
- Unsupported symbol message
- Rate limited / quota

Non-recoverable FMP errors fail immediately without Yahoo attempt.

---

## FMP ticker coverage (free plan)

| Blocked on FMP (→ Yahoo) | Working on FMP |
|--------------------------|----------------|
| QQQ, IWM, GLD, XSP, GOOG, AVGO | NVDA, MSFT, META, AMZN, JPM, XOM, GOOGL, SPY |

---

## Completed daily candle rule

- Cron: **06:00 SGT** (`0 22 * * *` UTC in `vercel.json`)
- Uses `lastCompletedTradingDate()` — latest fully closed NYSE session
- Never uses live, intraday, partial, pre-market, or after-hours data
- Yahoo: `interval=1d`, `includePrePost=false`

---

## `market_data` fields

| Field | Description |
|-------|-------------|
| `ticker` | Symbol |
| `price_date` | Completed candle date (YYYY-MM-DD) |
| `high`, `low` | Required OHLCV |
| `open`, `close` | Stored for reference |
| `volume` | Optional |
| `source` | `"fmp"` or `"yahoo"` |
| `average_price` | `(high + low) / 2` — **scanner scoring price** |
| `fetched_at` | Provider fetch timestamp |
| `updated_at` | Row update timestamp |

Scanner scoring uses **average_price**, not close.

---

## Indicators (computed after candle store)

From completed daily candles only:

- EMA20
- SMA50
- SMA200
- ATR14
- Stochastic Oscillator

Stored in `technical_indicators` with `source = "computed"`.

---

## Yahoo symbol mapping

| Watchlist | Yahoo |
|-----------|-------|
| `XSP` | `XSP.TO` |
| `BRK.B` / `BRKB` | `BRK-B` |
| `GOOG` | `GOOG` (separate listing) |
| `GOOGL` | `GOOGL` |
| Other dotted symbols | `.` → `-` |

Unsupported symbols are **not** silently dropped — errors appear in Data Health and `/api/test-market-data`.

---

## Data Health

**Market Data (FMP + Yahoo)** card shows:

| Field | Description |
|-------|-------------|
| FMP Success count | Tickers with current candle from FMP |
| Yahoo Success count | Tickers with current candle from Yahoo |
| Failed count | Missing/stale completed candle |
| Failed ticker table | Ticker, FMP error, Yahoo error, status |

**Watchlist Scanner** card:

- **Scanner Ready = Green** only when all active tickers have latest completed candle **and** valid indicators (any source)

---

## Test endpoints

### `GET /api/test-market-data`

Default symbols: QQQ, IWM, GLD, XSP, GOOG, GOOGL, AVGO, NVDA, SPY

Optional: `?symbols=QQQ,NVDA`

Returns per ticker:

- `fmpStatus`, `fmpError`
- `yahooStatus`, `yahooError`
- `selectedSource`
- `candleDate`, `high`, `low`, `averagePrice`
- `finalStatus`, `error`

### `GET /api/test-fmp`

Legacy FMP diagnostics + endpoint audit (still available).

---

## Cron workflow (06:00 SGT)

```
vercel.json: 0 22 * * *
    ↓
GET /api/cron/watchlist-refresh
    ↓
Per user (single pass, no duplicate API fetches):
  1. syncWatchlistDataForUser     → market_data + technical_indicators
  2. getWatchlistScannerDataForUser → scanner scores (DB read only)
  3. refreshAutoWatchlistAsAdmin  → auto_watchlist_results
  4. logScheduledRefresh          → audit logs
```

---

## Manual verification

On Data Health:

1. **Refresh Market Data**
2. **Refresh Technical Indicators**
3. **Refresh Auto Watchlist**

Expected:

- FMP symbols populate via FMP
- Blocked symbols populate via Yahoo
- Last Completed Candle = previous trading day
- Indicators Updated = Yes
- Scanner Ready = Green (if all tickers succeed)

---

## Key files

| File | Role |
|------|------|
| `lib/watchlist/market-data-provider.ts` | FMP client + fallback orchestration |
| `lib/watchlist/yahoo-market-data-provider.ts` | Yahoo chart API + symbol mapping |
| `lib/watchlist/market-data-probe.ts` | Per-ticker dual-provider probe |
| `lib/watchlist/market-data-fetch-error.ts` | Combined FMP + Yahoo error |
| `lib/watchlist/sync-watchlist-data.ts` | Sync loop, average_price, fetched_at |
| `lib/watchlist/market-data-source-breakdown.ts` | FMP/Yahoo/failed counts |
| `lib/data-health/fmp-status.ts` | Data Health diagnostics |
| `app/api/test-market-data/route.ts` | Multi-source test endpoint |
| `app/api/cron/watchlist-refresh/route.ts` | Scheduled refresh |
| `vercel.json` | `0 22 * * *` |

---

## Environment

```
FMP_API_KEY                 # FMP first; optional but recommended
CRON_SECRET                 # Cron auth
SUPABASE_SERVICE_ROLE_KEY   # Cron + admin sync
```

---

**Status:** Production ready — FMP + Yahoo fallback finalized.
