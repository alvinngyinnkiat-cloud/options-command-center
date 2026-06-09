# Premium Collected — Closed Trade Fix

**Date:** 2026-06-08  
**Status:** Complete — `npm run build` passes, unit tests added

---

## Issue

Closed trades were counted correctly in **Closed Trades**, **Win Rate**, and **My Realized P/L**, but **Premium Collected** did not reflect credits from closed trades when a trade was closed.

**Intended definition:**

```
Premium Collected = total credits received from all trades (open + closed + rolled)
```

**Example:**

| Trade   | Status | Credit (total premium) |
|---------|--------|------------------------|
| Trade A | Open   | US$101                 |
| Trade B | Closed | US$113                 |
| **Premium Collected** | | **US$214** |

---

## Investigation

### Trade Tracker summary (`/trades`)

`buildTradeTrackerSummary()` in `lib/trades/summary.ts` already summed premium across **all** trades — it did **not** filter by `status === open`.

Closed trades, win rate, and realized P/L use status-specific filters; premium was always intended to include every trade.

### Confirmed bug: Expected Return panel

`lib/trading-workflow/expected-return.ts` recalculated **Premium Collected** using **open trades only**:

```typescript
// Before (bug)
const totalPremiumCollected = open.reduce(
  (s, t) => s + t.calculations.totalPremiumReceived,
  0
);
```

When a trade closed, its premium dropped out of this total even though the credit was still on the record.

### Close persistence safeguard

The close flow (`closeOptionsTrade` → `tradeRowFromForm`) already preserved `premiumPerContract` / `credit_received`. A defensive fallback was added so updates that pass `premiumPerContract: 0` do not wipe stored credit on existing rows.

---

## Fix

### 1. Shared premium helpers — `lib/trades/premium-collected.ts`

| Function | Purpose |
|----------|---------|
| `getTradePremiumCollected(trade)` | Credit for one income trade (any status; excludes debit LEAPS) |
| `calculateTotalPremiumCollected(trades)` | Sum across **all** trades — open, managed, closing, closed, rolled |

### 2. Trade Tracker summary

`buildTradeTrackerSummary()` now calls `calculateTotalPremiumCollected(trades)` for a single, documented source of truth.

### 3. Expected Return dashboard

`buildExpectedReturnDashboard()` now uses `calculateTotalPremiumCollected(trades)` for the **Premium Collected** display metric (aligned with Trade Tracker).

Open-only premium is still used internally for **75% Profit Target** (`openPremiumCollected * 0.75`), since that target applies to open positions.

### 4. Persist safeguard — `tradeRowFromForm()`

```typescript
credit_received:
  input.premiumPerContract > 0
    ? input.premiumPerContract
    : existingRow
      ? Number(existingRow.credit_received)
      : input.premiumPerContract,
```

Prevents accidental zeroing of stored credit on close/edit.

---

## Tests

| File | Coverage |
|------|----------|
| `lib/trades/premium-collected.test.ts` | Open + closed sum (101 + 113 = 214), close persistence, summary parity |
| `lib/trades/summary.test.ts` | Summary card totals by status |
| `lib/trading-workflow/expected-return.test.ts` | Expected Return uses all-trade premium |

Run:

```bash
npm test -- lib/trades/premium-collected.test.ts lib/trades/summary.test.ts lib/trading-workflow/expected-return.test.ts
```

---

## Verification checklist

On **Options Trade Tracker** (`/trades`):

1. Note **Premium Collected** with one open trade (e.g. credit US$101).
2. Close a second trade with credit US$113 (or confirm an existing closed trade).
3. Reload the page after close.
4. Confirm **Premium Collected** = sum of credits on all trade rows (e.g. US$214).
5. Confirm **Closed Trades**, **Win Rate**, and **My Realized P/L** still update as before.

On **Trade Queue / Expected Return** (if used):

6. Confirm **Premium Collected** matches the Trade Tracker total (includes closed credits).

---

## Files changed

- `lib/trades/premium-collected.ts` (new)
- `lib/trades/premium-collected.test.ts` (new)
- `lib/trades/summary.ts`
- `lib/trades/summary.test.ts` (new)
- `lib/trades/summary.integration.test.ts` (new)
- `lib/trades/map-trade.ts`
- `lib/trading-workflow/expected-return.ts`
- `lib/trading-workflow/expected-return.test.ts` (new)

---

## Build

```bash
npm run build
```

Exit code: **0** (passes)
