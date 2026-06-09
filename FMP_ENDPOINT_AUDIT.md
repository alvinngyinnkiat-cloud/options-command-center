# FMP Endpoint Audit

**Date:** 2026-06-09  
**Issue:** NVDA returns valid JSON; QQQ, GLD, XSP, IWM fail with `Unexpected token 'P', "Premium Qu"... is not valid JSON`  
**Production code:** Not modified (audit + `/api/test-fmp` only)

---

## Executive summary

All symbols use the **same endpoint**. Failures are **not** caused by different URLs or JSON schema differences. FMP returns **HTTP 402** with a **plain-text** subscription message for certain symbols on the **current (free) plan**. Production code calls `res.json()` on that body, which triggers the parse error.

| Root cause | Premium / special-symbol restriction on free tier |
|------------|---------------------------------------------------|
| HTTP status | **402 Payment Required** (not 401/429) |
| Body format | Plain text starting with `Premium Query Parameter:` |
| Misleading header | `Content-Type: application/json` (body is not JSON) |

---

## 1. Exact URLs used (all symbols)

Base endpoint (production + audit):

```
https://financialmodelingprep.com/stable/historical-price-eod/full
```

| Symbol | Full URL (apikey redacted) | Date range (audit run) |
|--------|----------------------------|-------------------------|
| **QQQ** | `.../full?symbol=QQQ&from=2026-05-10&to=2026-06-09&apikey=REDACTED` | 30 days → completed target |
| **GLD** | `.../full?symbol=GLD&from=2026-05-10&to=2026-06-09&apikey=REDACTED` | same |
| **XSP** | `.../full?symbol=XSP&from=2026-05-10&to=2026-06-09&apikey=REDACTED` | same |
| **IWM** | `.../full?symbol=IWM&from=2026-05-10&to=2026-06-09&apikey=REDACTED` | same |
| **NVDA** | `.../full?symbol=NVDA&from=2026-05-10&to=2026-06-09&apikey=REDACTED` | same |

Built in: `lib/watchlist/market-data-provider.ts` → `FMP_EOD_ENDPOINT`

Path breakdown:

| Segment | Value |
|---------|--------|
| Host | `financialmodelingprep.com` |
| API version | **`/stable/`** (not `/api/v3/`) |
| Route | **`historical-price-eod/full`** |
| Params | `symbol`, `from`, `to`, `apikey` |

---

## 2. Raw HTTP response (before JSON.parse)

Audit script: `scripts/audit-fmp-endpoints.mjs`  
Audit module: `lib/watchlist/fmp-endpoint-audit.ts` (uses `res.text()` first)

Production bug: `FmpMarketDataProvider.fetchDailyCandles()` calls `res.json()` **without** reading text first, so plain-text 402 bodies throw.

---

## 3. Response classification

### Failing symbols (QQQ, GLD, XSP, IWM)

| Field | Value |
|-------|--------|
| HTTP status | **402** |
| Content-Type | `application/json; charset=utf-8` *(incorrect for body)* |
| Body type | **Plain text — subscription restriction** |
| Preview (first ~200 chars) | `Premium Query Parameter: 'Special Endpoint : This value set for 'symbol' is not available under your current subscription please visit our subscription page to upgrade your plan at https://financialmo...` |
| JSON parse | **Fails** — `Unexpected token 'P', "Premium Qu"... is not valid JSON` |

**Not:** rate limit, HTML error page, unsupported empty JSON, or wrong endpoint path.

**Is:** FMP **premium / special-symbol gating** on current plan.

### Success symbol (NVDA)

| Field | Value |
|-------|--------|
| HTTP status | **200** |
| Content-Type | `application/json; charset=utf-8` |
| Body type | **JSON array** of daily OHLCV objects |
| Preview | `[ { "symbol": "NVDA", "date": "2026-06-08", "open": 210.18, "high": 210.47, "low": 206, "close": 208.64, ...` |
| Candle count | 20 (30-day window) |

---

## 4. NVDA vs failing ETF requests — comparison

| Aspect | NVDA (success) | QQQ / GLD / IWM / XSP (fail) |
|--------|----------------|------------------------------|
| Endpoint path | `/stable/historical-price-eod/full` | **Identical** |
| Query params | `symbol`, `from`, `to`, `apikey` | **Identical** |
| HTTP status | 200 | **402** |
| Body | JSON array | Plain-text premium message |
| `res.json()` | Works | **Throws** |

**Conclusion:** Same request shape; difference is **FMP subscription entitlements per symbol**, not client URL construction.

---

## 5. Endpoint path verification

| Path | Used? |
|------|-------|
| `/stable/historical-price-eod/full` | **Yes — production** |
| `/stable/historical-price-eod` (no `/full`) | Tested — **404 / `[]` for QQQ** |
| `/api/v3/historical-price-full/{symbol}` | Tested — **403 Legacy Endpoint** |
| `/stable/quote` | Tested — **402** for QQQ on free tier |

Production uses only the **stable full EOD** endpoint.

---

## 6. Full watchlist symbol matrix (live audit)

Same endpoint, same date range, current API key:

| Symbol | HTTP | On free tier? |
|--------|------|----------------|
| NVDA | 200 | Yes |
| MSFT | 200 | Yes |
| META | 200 | Yes |
| AMZN | 200 | Yes |
| JPM | 200 | Yes |
| XOM | 200 | Yes |
| SPY | 200 | Yes |
| GOOGL | 200 | Yes |
| **QQQ** | **402** | **No — premium symbol** |
| **IWM** | **402** | **No** |
| **GLD** | **402** | **No** |
| **XSP** | **402** | **No** |
| **GOOG** | **402** | **No** (GOOGL works) |
| **AVGO** | **402** | **No** |

**Watchlist impact:** 6 of 12 default tickers blocked on current plan.

---

## 7. Recommended endpoint for your plan

### Current plan (free)

Keep using:

```
GET https://financialmodelingprep.com/stable/historical-price-eod/full
?symbol={SYMBOL}&from={YYYY-MM-DD}&to={YYYY-MM-DD}&apikey={KEY}
```

This **already works** for entitled symbols (stocks above). No alternate free endpoint unlocks QQQ/IWM/GLD on the same key.

### To unlock full watchlist (QQQ, IWM, GLD, XSP, GOOG, AVGO)

| Option | Action |
|--------|--------|
| **Recommended** | Upgrade FMP to **Starter ($22/mo)** or higher — includes broader symbol / “special endpoint” access |
| Symbol workaround | Use **GOOGL** instead of **GOOG** where both represent Alphabet |
| XSP | Canadian TSX ticker — may need **`XSP.TO`** or remain blocked; verify after upgrade |
| Legacy v3 | **Not available** — returns 403 for new subscriptions |

### Future production fix (not applied in this audit)

1. Read `await res.text()` before parse  
2. Treat **HTTP 402** + `Premium Query Parameter` as subscription error (not JSON parse exception)  
3. Surface per-symbol 402 in Data Health failed tickers  

---

## 8. `/api/test-fmp` updates (audit-only path)

`GET /api/test-fmp` now includes `endpointAudit[]` per symbol:

| Field | Description |
|-------|-------------|
| `endpoint` | Base URL used |
| `urlWithoutApiKey` | Full request URL (key redacted) |
| `httpStatus` | e.g. 200 vs 402 |
| `contentType` | Response header |
| `rawPreview` | First **200 characters** of raw body |
| `responseKind` | e.g. `json_array`, `premium_restriction` |
| `parseError` | JSON parse message if any |
| `candleCount` | Length when JSON valid |
| `classification` | Human-readable summary |

Implementation: `lib/watchlist/fmp-endpoint-audit.ts` + `app/api/test-fmp/route.ts`

**Production** `market-data-provider.ts` unchanged.

---

## 9. How to reproduce

```powershell
# Live audit script (no key printed)
node scripts/audit-fmp-endpoints.mjs

# Via app (after npm run dev)
Invoke-RestMethod http://localhost:3000/api/test-fmp | ConvertTo-Json -Depth 6
```

Inspect `endpointAudit` array for per-symbol `httpStatus` and `rawPreview`.

---

## Stop

Audit complete. Production sync logic not modified. Upgrade FMP plan or adjust watchlist symbols to match free-tier entitlements before expecting Scanner Ready = Green for all tickers.
