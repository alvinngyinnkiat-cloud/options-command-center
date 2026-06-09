# Watchlist Multi-Source Data Engine

FMP-first daily OHLCV with Yahoo Finance fallback for symbols blocked on the free FMP plan.

## Problem

FMP free tier returns **HTTP 402** (premium endpoint) for:

- QQQ, IWM, GLD, XSP, GOOG, AVGO

Those symbols still need completed daily candles for the Watchlist Scanner.

## Solution

```
Active watchlist ticker
        │
        ▼
  fetchDailyCandlesForTicker()
        │
        ├─► FMP (if FMP_API_KEY set)
        │     success → source = "fmp"
        │     recoverable failure → fall through
        │
        └─► Yahoo Finance chart API v8
              success → source = "yahoo"
```

### Recoverable FMP failures (trigger Yahoo fallback)

- HTTP 402 / 403
- Premium Query Parameter response body
- Subscription / legacy endpoint error messages
- Non-JSON body (e.g. plain-text premium message)
- Empty candle array

Non-recoverable errors (network, invalid key on Yahoo path, etc.) propagate and mark the ticker as failed during sync.

## Files

| File | Role |
|------|------|
| `lib/watchlist/market-data-provider.ts` | FMP client, `fetchDailyCandlesForTicker()`, fallback orchestration |
| `lib/watchlist/yahoo-market-data-provider.ts` | Yahoo chart API; `XSP` → `XSP.TO` |
| `lib/watchlist/sync-watchlist-data.ts` | Upserts OHLCV + indicators; tracks `fmpTickers` / `yahooTickers` |
| `lib/watchlist/market-data-source-breakdown.ts` | Groups latest completed candles by stored `source` |
| `lib/watchlist/scanner-status.ts` | Scanner Ready when all active tickers have completed candles (any source) |
| `lib/data-health/fmp-status.ts` | FMP + Yahoo symbol counts for Data Health |
| `components/data-health/FmpHealthCard.tsx` | Displays FMP Symbols / Yahoo Symbols |

## Stored schema (`market_data`)

Unchanged. Required fields per row:

| Field | Notes |
|-------|--------|
| `price_date` | Completed trading date (YYYY-MM-DD) |
| `high`, `low`, `close` | From provider |
| `volume` | Nullable if provider omits |
| `source` | `"fmp"` or `"yahoo"` |

Indicators (`technical_indicators`) are computed locally with `source = "computed"`.

## Indicators (unchanged)

Computed from stored candles regardless of provider:

- **Average Price** = (High + Low) / 2
- EMA20, SMA50, SMA200, ATR14, Stochastic

## Data Health

**FMP Market Data** card shows:

- **FMP Symbols** — count + ticker list (latest completed candle sourced from FMP)
- **Yahoo Symbols** — count + ticker list (fallback)

**Watchlist Scanner** card:

- **Scanner Ready** = all active tickers have a completed daily candle through the target date **and** indicators for that date, regardless of whether data came from FMP or Yahoo.

## Sync result

`syncWatchlistDataForUser()` returns:

```typescript
{
  providerSource: "fmp" | "yahoo" | "mixed" | "none",
  fmpTickers: number,
  yahooTickers: number,
  // ...
}
```

## Yahoo API

- Endpoint: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}`
- Interval: `1d`, `includePrePost: false`
- Dates normalized to America/New_York for completed-candle alignment

## Testing

```bash
npm test -- lib/watchlist/market-data-provider.test.ts lib/watchlist/yahoo-market-data-provider.test.ts
npm run build
```

Live probe (includes per-symbol source after fallback):

```
GET /api/test-fmp
```

## Environment

| Variable | Required |
|----------|----------|
| `FMP_API_KEY` | Optional but recommended — without it, all symbols use Yahoo |
