# FMP Setup Guide — Watchlist Live Data

**Audit date:** 2026-06-08  
**Scope:** Watchlist Scanner OHLCV pipeline (Phase 3A)  
**Status:** Read-only audit — no code changes

---

## Quick diagnosis

| Symptom | Most likely cause |
|---------|-------------------|
| OHLC rows = 0 | Refresh never run, `FMP_API_KEY` missing, or Supabase write blocked by RLS |
| Last Candle Date blank | No rows in `market_data` for your active watchlist |
| Refresh alert / log error | Missing key, FMP HTTP error, empty candle response, or RLS denial |
| Partial success | Some tickers invalid on FMP (e.g. `XSP`) while others succeed |

---

## 1. Where `FMP_API_KEY` should be stored

### Correct location

| Environment | File / system | Notes |
|-------------|---------------|-------|
| **Local dev** | `.env.local` at project root | Same file as Supabase vars; **never commit** |
| **Vercel / production** | Project → Settings → Environment Variables | Server-only; all environments that run sync |
| **Cron** | Same host env as the deployed app | Cron route runs server-side; reads `process.env.FMP_API_KEY` |

### Example (`.env.local`)

```env
FMP_API_KEY=your_fmp_api_key_here
```

### Rules enforced by the codebase

- **Server-only** — read via `process.env.FMP_API_KEY` in `lib/watchlist/market-data-provider.ts`
- **Do NOT prefix with `NEXT_PUBLIC_`** — would expose the key to the browser
- **Restart required** — after adding/changing the key, restart `npm run dev` or redeploy
- **Not stored in Supabase** — key stays in host environment; only OHLCV *results* go to `market_data`

### Where the key is read

```71:73:lib/watchlist/market-data-provider.ts
  const fmpKey = process.env.FMP_API_KEY;
  if (fmpKey) return new FmpMarketDataProvider(fmpKey);
  return null;
```

If missing, sync throws:

> `FMP_API_KEY is not configured — cannot fetch live daily candles.`

---

## 2. Required environment variables

### Watchlist OHLCV pipeline (minimum)

| Variable | Required | Purpose |
|----------|----------|---------|
| `FMP_API_KEY` | **Yes** | Fetch daily OHLCV from FMP |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Supabase client (RLS-scoped reads/writes) |

### Dev without Supabase Auth sign-in

| Variable | Required | Purpose |
|----------|----------|---------|
| `SUPABASE_DEV_USER_ID` | Recommended | UUID of your dev user (must own watchlist rows) |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Enables dev server writes via service role |

> **Important:** The watchlist sync path (`sync-watchlist-data.ts`) uses `createClient()` (anon + session cookie), **not** the dev service-role client. In dev without a signed-in Supabase session, `market_data` upserts can fail RLS even when `SUPABASE_DEV_USER_ID` is set. See [§6](#6-why-ohlc-rows-are-zero).

### Scheduled post-close refresh (optional)

| Variable | Required | Purpose |
|----------|----------|---------|
| `CRON_SECRET` | Yes (cron) | Bearer token for `GET /api/cron/watchlist-refresh` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (cron) | Admin client bypasses session; iterates all users |

### Same key, other features

| Feature | Also uses `FMP_API_KEY` |
|---------|-------------------------|
| Dividend sync | Yes — primary provider in `lib/dividends/dividend-data-service.ts` |
| Auto Watchlist screener | **No** — uses separate `MARKET_DATA_API_KEY` (not wired; still mock) |

### Legacy / unused for watchlist OHLCV

| Variable | Status |
|----------|--------|
| `MARKET_DATA_API_KEY` | Referenced only by Auto Watchlist (`lib/auto-watchlist/market-data-service.ts`); **does not** power Watchlist Scanner candles |

---

## 3. Expected FMP plan

### Endpoint used

**Stable API** (not legacy `/api/v3/`):

```
GET https://financialmodelingprep.com/stable/historical-price-eod/full
```

Documented on [FMP Quickstart](https://site.financialmodelingprep.com/developer/docs/quickstart) as **Stock Price and Volume Data** (full OHLCV).

### Minimum plan for this app

| Requirement | App need | FMP guidance |
|-------------|----------|--------------|
| Daily EOD OHLCV | Yes | Available on free tier (250 calls/day) |
| Date range | ~400 days fetched, 260 stored per ticker | Free: ~5 years history; **Starter+** for 30+ years |
| `from` / `to` params | Yes — passed on every sync | Supported on historical EOD endpoints |
| Rate limit | 1 API call **per active watchlist ticker** per refresh | Free: 250/day — fine for ~5–20 tickers if refreshed 1–2×/day |

### Recommended plan

| Use case | Plan |
|----------|------|
| Dev / small watchlist (≤10 tickers) | **Free** — sufficient if stable EOD endpoint is enabled on your account |
| Production daily cron + dividends + larger watchlist | **Starter ($22/mo)** or **Premium ($59/mo)** — higher call limits and full history for SMA200 on long lookbacks |

### History note

Indicators require **200+ daily candles** for SMA200 (`lib/watchlist/compute-indicators.ts`). Free tier 5-year history is enough; if FMP returns fewer bars, sync logs:

> `Insufficient candle history for indicator calculation`

---

## 4. Market data endpoint being called

### Request shape (from code)

```42:42:lib/watchlist/market-data-provider.ts
    const url = `https://financialmodelingprep.com/stable/historical-price-eod/full?${params}`;
```

Query parameters:

| Param | Value | Example |
|-------|-------|---------|
| `symbol` | Uppercase ticker | `SPY` |
| `from` | ~400 days before completed candle | `2025-05-01` |
| `to` | Last completed NYSE session | `2026-06-08` |
| `apikey` | Your `FMP_API_KEY` | (secret) |

### Response handling

Code accepts either:

- A JSON **array** of candle objects, or
- An object with `{ historical: [...] }`

Each row mapped to: `date`, `open`, `high`, `low`, `close`, `volume`.

Rows without a valid `date` + finite `close` are dropped.

### Full pipeline after fetch

```
FMP EOD API
  → syncWatchlistDataForUser()
  → filter candles ≤ lastCompletedTradingDate()
  → upsert market_data (up to 260 rows per ticker)
  → computeIndicatorsFromCandles()
  → upsert technical_indicators
  → getWatchlistScannerData() → persist scanner_scores
```

Trigger paths:

- **Manual:** Data Health → **Refresh Market Data** (`app/actions/data-health.ts`)
- **Cron:** `GET /api/cron/watchlist-refresh` (weekdays 21:30 UTC in `vercel.json`)

---

## 5. Test ticker used for validation

### No dedicated FMP smoke script exists

The repo does **not** ship a `scripts/verify-fmp.mjs`. Validation is manual.

### Recommended validation ticker: **SPY**

| Reason | Detail |
|--------|--------|
| Unit tests | `lib/watchlist/scoring/map-row.test.ts` uses `SPY` |
| Default watchlist | ETF category seed includes `SPY` (`lib/watchlist/categories.ts`) |
| FMP coverage | US large-cap ETF — reliably on FMP |
| Liquidity | High — good sanity check for OHLCV values |

### Default ETF seed tickers (all refreshed on sync)

```
XSP, SPY, QQQ, IWM, GLD
```

**Caution:** `XSP` may fail or return empty on FMP depending on symbol mapping (Canadian/ASX vs US). If refresh is **partial**, check Data Source Log errors for `XSP: ...` while `SPY` succeeds.

### Manual curl test (replace key)

```bash
curl "https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=SPY&from=2025-01-01&to=2026-06-08&apikey=YOUR_FMP_API_KEY"
```

Expect: HTTP 200 and a non-empty JSON array (or `{ "historical": [ ... ] }`) with recent `date`, `open`, `high`, `low`, `close`.

---

## 6. Why OHLC rows are zero

The Data Health **Market Data API** card counts distinct tickers in `market_data`. Zero means **no rows exist** for your watchlist IDs (not that FMP returned zeros).

### Root causes (in order of likelihood)

#### A. Refresh never executed

OHLCV is **not** fetched on page load. You must:

1. Configure `FMP_API_KEY`
2. Open **Data Health** → click **Refresh Market Data**

Until refresh succeeds, `market_data` stays empty.

#### B. `FMP_API_KEY` missing or wrong

- Sync throws before any DB write
- Data Source Log shows `failed` with message containing `FMP_API_KEY is not configured`
- Or per-ticker: `FMP OHLCV fetch failed for SPY: 401` / `403`

#### C. Supabase not configured

- `isSupabaseConfigured()` false → app runs in mock mode; sync throws `Supabase is required`
- No writes to real `market_data`

#### D. No active watchlist tickers

- `watchlist` table empty or all `is_active = false`
- Sync runs but processes 0 tickers → 0 rows

#### E. FMP returned empty candles

- Invalid symbol, plan restriction, or rate limit
- Per-ticker error: `No completed candles through YYYY-MM-DD`
- Log status: `partial` or `failed`; `recordsUpdated: 0`

#### F. Supabase RLS blocked writes (common in local dev)

`market_data` RLS requires `auth.uid()` to match the watchlist owner:

```187:201:supabase/migrations/20260607220900_advisor_warning_cleanup.sql
CREATE POLICY "Users manage own market_data via watchlist"
  ON public.market_data FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.watchlist w
      WHERE w.id = market_data.watchlist_id
        AND w.user_id = (SELECT auth.uid())
    )
  )
```

Sync uses `createClient()` (cookie session), **not** service role, for manual refresh. If you use `SUPABASE_DEV_USER_ID` without signing in:

- `requireUserId()` resolves your dev UUID ✓
- But `auth.uid()` on the Supabase client may be **null** ✗
- Upserts fail silently per ticker → errors like `new row violates row-level security policy`

**Workarounds:**

1. Sign in via Supabase Auth in the browser (production-session mode), or
2. Confirm errors in Data Source Log after refresh (partial/failed + RLS message)

#### G. All tickers failed indicator step after fetch

Less common — candles fetched but indicator compute failed; market rows may still exist. Check `recordsUpdated` vs `recordsFailed` in logs.

---

## 7. Why Last Candle Date is blank

**Source:** `lib/watchlist/scanner-status.ts` → `getWatchlistScannerHealthStatus()`

```110:113:lib/watchlist/scanner-status.ts
  const lastCandleDate =
    candleDates.length > 0
      ? candleDates.sort((a, b) => b.localeCompare(a))[0]!
      : null;
```

`Last Candle Date` is **null** (shown as `—`) when:

| Condition | Result |
|-----------|--------|
| No `market_data` rows for active watchlist IDs | Blank |
| Supabase not configured | Blank (mock mode) |
| Active watchlist count = 0 | Blank |
| RLS hides rows from current session | Blank (query returns empty) |

It is **not** fetched live from FMP on the health check — it reads whatever is already in Supabase.

After a successful refresh, expect:

```
Last Candle Date = lastCompletedTradingDate()
```

(e.g. previous NYSE session if today’s market not yet closed — see `lib/market-calendar/nyse-calendar.ts`)

---

## 8. How to verify a successful FMP connection

### Step 1 — Confirm env var (local)

```powershell
# From project root — key should appear (do not paste in chat)
Select-String -Path .env.local -Pattern "^FMP_API_KEY="
```

Restart dev server after any change.

### Step 2 — Direct FMP test (outside app)

```powershell
$key = "YOUR_FMP_API_KEY"
Invoke-RestMethod "https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=SPY&from=2025-06-01&to=2026-06-08&apikey=$key" | ConvertTo-Json -Depth 3
```

**Success criteria:**

- HTTP 200
- Non-empty array with objects containing `"date"`, `"open"`, `"high"`, `"low"`, `"close"`
- Most recent `date` ≤ today and matches a recent trading day

**Failure signals:**

| Response | Meaning |
|----------|---------|
| 401 / 403 | Invalid or inactive API key |
| Empty `[]` | Symbol/plan issue or wrong endpoint |
| `"Error Message"` in JSON body | FMP error (quota, subscription) |

### Step 3 — In-app refresh

1. Ensure Supabase connected (Data Health badge: **Supabase connected**)
2. Ensure at least one **active** watchlist ticker (e.g. SPY)
3. Data Health → **Refresh Market Data**
4. No alert popup = action returned success (check anyway)

### Step 4 — Data Health cards

| Card | Success looks like |
|------|-------------------|
| **Watchlist Scanner** | Last Candle Date populated; Scanner Ready = **Green / Ready** |
| **Market Data API** | Tickers updated > 0; latest date = completed candle target |
| **Technical Indicator Data** | Missing indicators = None |

### Step 5 — Data Source Log

After refresh, newest row for `market_data`:

| Field | Success |
|-------|---------|
| Status | `success` or `partial` |
| Updated | > 0 (often hundreds — 260 candles × N tickers) |
| Failed | 0 (or only known bad symbols like XSP) |
| Error | `—` or specific ticker messages |

### Step 6 — Supabase table check

In Supabase SQL editor:

```sql
SELECT md.ticker, md.price_date, md.open, md.high, md.low, md.close, md.source
FROM market_data md
JOIN watchlist w ON w.id = md.watchlist_id
WHERE w.user_id = 'YOUR_USER_UUID'
ORDER BY md.price_date DESC
LIMIT 10;
```

**Success:** Rows with `source = 'fmp'`, recent `price_date`, non-null OHLC.

### Step 7 — Watchlist Scanner page

Open `/watchlist` — rows should show:

- Average Price = (High + Low) / 2 from stored candle
- EMA20, SMA50, SMA200, ATR14, Stochastic populated (not all zeros)
- `dataSource: supabase` in server logs (not mock fallback)

### Step 8 — Dividend cross-check (optional)

If dividends sync works with the same key, FMP auth is valid:

Data Health → **Refresh Dividend Data** → provider shows **FMP**.

---

## Troubleshooting matrix

| Observation | Action |
|-------------|--------|
| curl works, app shows 0 rows | Run refresh; check RLS / auth session; read Data Source Log errors |
| curl fails 401 | Regenerate key at [FMP dashboard](https://site.financialmodelingprep.com/) |
| curl returns `[]` for SPY | Upgrade plan or confirm stable EOD access on your subscription |
| Partial refresh, XSP fails | Test SPY alone; remove or replace unsupported symbols |
| `FMP_API_KEY is not configured` | Add to `.env.local`, restart server |
| Mock mode badge | Set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Last Refresh Time set, Candle Date blank | Refresh failed mid-flight or RLS blocked inserts — check failed log row |

---

## File reference

| File | Role |
|------|------|
| `lib/watchlist/market-data-provider.ts` | FMP client + endpoint |
| `lib/watchlist/sync-watchlist-data.ts` | Fetch → `market_data` → indicators |
| `lib/watchlist/refresh-watchlist-scanner.ts` | Orchestrates sync + rescore |
| `lib/watchlist/scanner-status.ts` | Last Candle Date / Scanner Ready |
| `app/actions/data-health.ts` | Manual refresh action |
| `app/api/cron/watchlist-refresh/route.ts` | Scheduled refresh |
| `lib/data-health/audit-sources.ts` | Market Data health card |
| `components/data-health/WatchlistScannerHealthCard.tsx` | Scanner Ready UI |

---

## Stop

Audit complete. `FMP_SETUP_GUIDE.md` created. Awaiting next instruction.
