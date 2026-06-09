# Watchlist Auto-Refresh Schedule

Production watchlist pipeline runs **daily at 06:00 Singapore Time (SGT)**.

## Why 06:00 SGT

- US market close data is fully finalized
- FMP / Yahoo EOD data is available
- Eliminates partial-candle and stale-indicator risk
- Auto Watchlist is ready before morning analysis

## Schedule

| Setting | Value |
|---------|--------|
| Timezone | `Asia/Singapore` |
| Local time | **06:00** daily |
| Local cron intent | `0 6 * * *` |
| Vercel cron (UTC) | `0 22 * * *` |

Vercel cron jobs run in **UTC**. Singapore is UTC+8 with no DST, so **06:00 SGT = 22:00 UTC** (previous calendar day in UTC).

## Daily workflow (06:00 SGT)

```
Refresh Market Data (FMP → Yahoo fallback)
  → completed daily candles only
  → upsert market_data
  → compute EMA20, SMA50, SMA200, ATR14, Stochastic
  → upsert technical_indicators
Update Watchlist Scanner scores
Generate Auto Watchlist
Log watchlist_scheduled_refresh
Data Health reflects Scanner Ready status
```

## Route

`GET /api/cron/watchlist-refresh`

- Protected by `Authorization: Bearer ${CRON_SECRET}`
- Skips if US session not yet closed (safety guard)
- Iterates all users with active watchlist items

## Data Health display

| Field | Source |
|-------|--------|
| Last Automated Refresh | `watchlist_scheduled_refresh` log, formatted `YYYY-MM-DD HH:mm SGT` |
| Last Completed Candle | Previous NYSE trading day (`lastCompletedTradingDate`) |
| Indicators Updated | All active tickers have indicators for target date |
| Auto Watchlist Updated | Latest `auto_watchlist` log after scheduled run |
| Scanner Ready | Green when candles + indicators complete (any source) |
| Data Source | FMP / FMP (Yahoo fallback) |

## Manual refresh

These buttons remain available and **do not** alter the 06:00 SGT schedule:

- Refresh Market Data
- Refresh Technical Indicators
- Refresh Auto Watchlist

Manual runs log to their respective `data_source_logs` sources; automated runs also write `watchlist_scheduled_refresh`.

## Rules (unchanged)

- Completed daily candles only — no intraday or partial candles
- Average Price = (High + Low) / 2
- Scanner uses Average Price only
- Support/Resistance remains manual

## Files

| File | Role |
|------|------|
| `vercel.json` | UTC cron `0 22 * * *` |
| `lib/watchlist/scheduled-refresh-config.ts` | Timezone + formatting constants |
| `lib/watchlist/run-scheduled-watchlist-refresh.ts` | Full pipeline per user |
| `app/api/cron/watchlist-refresh/route.ts` | Cron entrypoint |
| `lib/watchlist/scanner-status.ts` | Health fields for Data Health UI |
| `components/data-health/WatchlistScannerHealthCard.tsx` | Schedule + status display |
