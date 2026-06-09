# Current Option Value — Completion Report

**Date:** 2026-06-08  
**Status:** Complete — manual browser verification passed

---

## Summary

Fixed the Current Option Value save flow so it is **manual-only**, returns a **serializable server action response**, and no longer crashes the UI with `undefined` or “unexpected response from server” errors.

---

## Problem

When saving Current Option Value for an options trade, the app showed:

1. **Runtime Error:** `undefined`
2. **An unexpected response was received from the server**
3. Stack included `fetchServerAction` / `onUnhandledRejection` / `coerceError`

Additional requirements:

- Current Option Value must be **manual only** (no system, broker, auto feed, or source selector)
- Blank value should show **“Not updated”**, not `$0.00`
- P/L formula: **Premium Received − Current Option Value**
- All views (Summary, Card, Detailed) must use the manual value

---

## Root Cause

Two issues combined:

### 1. Invalid / oversized server action response

After save, `updateTradeCurrentValue` called `finish()`, which reloaded the entire `TradeTrackerData` payload. That large response could fail Next.js server action deserialization, producing *“An unexpected response was received from the server”* and an unhandled rejection.

### 2. Empty Supabase error messages

When Supabase rejected the upsert, the code did `throw new Error(error.message)`. Some Supabase errors have no `message`, so the thrown error became the literal string `"undefined"`, which the client displayed as a runtime error.

Contributing factors:

- Source selector could write non-manual values conflicting with DB constraints
- Blank input was coerced to `0` via `parseFloat(value) || 0` instead of `null`

---

## Solution

### Server action response

`updateTradeCurrentValue` now returns a consistent, JSON-safe object:

```typescript
// Success
{ ok: true, trade: EnrichedTrade }

// Failure
{ ok: false, error: "clear error message" }
```

- Wrapped in try/catch at both action and client layers
- Persist errors caught separately and returned as `{ ok: false, error }`
- Response serialized via `serializeServerActionPayload()` (replaces `undefined` / non-finite numbers with `null`)
- Supabase errors formatted via `formatSupabaseError()` (message, details, hint, or code fallback)

### Manual-only value

- UI: value, updated date, notes only — no source selector
- Save always sets `current_value_source = "manual"` and `system_current_option_value = 0`
- Valuation uses `manualCurrentOptionValue` only via `resolveManualOptionValue()`
- Blank manual value → `null` in DB → **“Not updated”** in UI

### P/L

- **Current P/L = Premium Received − Current Option Value** when a manual value is set
- Open trades without a manual value show **“Not updated”** for P/L columns

---

## Save Flow

```
EditCurrentValueModal (client)
  → updateTradeCurrentValue()          [app/actions/trades.ts]
  → applyCurrentValueUpdate()          [lib/trades/map-trade.ts]
  → persistOptionsTrade()              [lib/supabase/queries/options-trades.ts]
  → enrichOptionsTradeRow()            [lib/supabase/queries/options-trades.ts]
  → serializeServerActionPayload()
  → { ok: true, trade } | { ok: false, error }
```

---

## Files Modified

| File | Change |
|------|--------|
| `lib/trades/server-action-response.ts` | **New** — `serializeServerActionPayload`, `formatActionError`, `formatSupabaseError` |
| `lib/trades/types.ts` | `UpdateCurrentValueResult`; `UpdateCurrentValueInput` without source; `currentOptionValue: number \| null` |
| `app/actions/trades.ts` | `updateTradeCurrentValue` returns `{ ok, trade }` / `{ ok, error }`; no longer calls `finish()` |
| `lib/supabase/queries/options-trades.ts` | `enrichOptionsTradeRow()`; Supabase error formatting |
| `lib/trades/map-trade.ts` | `resolveTradeValuation()` manual-only; `applyCurrentValueUpdate()` always `source = "manual"` |
| `lib/trades/valuation.ts` | `resolveManualOptionValue()`; deprecated system fallback |
| `lib/trades/valuation.test.ts` | Updated for manual-only behavior |
| `lib/trades/format.ts` | `formatCurrentOptionValueDisplay()`, `CURRENT_OPTION_VALUE_NOT_UPDATED` |
| `components/trades/EditCurrentValueModal.tsx` | Manual-only form; try/catch/finally; checks `result.ok` |
| `components/trades/OpenTradesTable.tsx` | Summary / card / detailed use manual value + “Not updated” |
| `components/trades/TradeDetailDrawer.tsx` | Removed system/broker/source/difference fields |
| `components/trades/TradeTrackerClient.tsx` | Footer text updated for manual-only P/L |

---

## Requirements Checklist

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Trace save action | Done |
| 2 | Server action returns valid serializable response | Done |
| 3 | Do not throw raw undefined errors | Done |
| 4 | Wrap action in try/catch | Done |
| 5 | Return `{ ok: true, trade }` or `{ ok: false, error }` | Done |
| 6 | Remove System/Broker source logic | Done |
| 7 | Always save `current_value_source = "manual"` | Done |
| 8 | Supabase failure → `ok: false` with actual error message | Done |
| 9 | Client displays error instead of crashing | Done |
| 10 | Manual value persists after refresh | Done |
| 11 | P/L = Premium Received − Current Option Value | Done |
| 12 | Blank value → “Not updated” not 0 | Done |
| 13 | Summary / Card / Detailed views use manual value | Done |
| 14 | `npm run build` passes | Done |

---

## Manual Verification (2026-06-08)

Browser testing on `/trades` — **passed**:

- [x] Save works
- [x] Refresh persistence works
- [x] P/L updates correctly
- [x] No runtime error

---

## Build & Tests

- **`npm run build`** — passed
- **`npm test`** — 185/185 passed (including updated `valuation.test.ts`)

---

## Notes

- DB column name is `current_value_source` (enum: `manual`, `broker`, `system`); saves always write `"manual"`.
- After successful save, the client calls `onSaved()` → page reload to refresh tracker data.
- Dev server Turbopack cache corruption (separate issue) can cause Internal Server Error if multiple `next dev` processes run concurrently; operational fix is stop all Node processes, delete `.next`, start one dev server.

---

## Conclusion

Current Option Value is **manual-only**, saves reliably with a **valid server action response**, and displays errors gracefully. Manual browser verification confirms save, persistence, P/L, and error-free operation.
