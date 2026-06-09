# Closed Trade P/L + Monetary Precision Fix

**Date:** 2026-06-08  
**Status:** Complete — `npm run build` passes

---

## Problem

Closed trade XSP showed **My P/L = +US$113.00** (full premium) after closing at **0.514 per contract**, instead of the expected net profit:

| Field | Expected |
|-------|----------|
| Premium Received | US$113.51 |
| Closing Debit (0.514 × 100 × 1) | US$51.40 |
| Realized P/L | **≈ US$62.11** |

---

## Root Cause

### Data model

`options_trades` fields used for closing:

| Column | Format | Purpose |
|--------|--------|---------|
| `credit_received` | Per-contract credit | Entry premium → `Premium Received = credit × 100 × contracts` |
| `exit_debit` | **Total USD closing cost** | Stored on close — NOT per-contract |
| `realized_pnl` | Total USD | Persisted from calculation |
| `current_value` / manual option value | Total close cost (open only) | Unrealized P/L for open trades |
| `status` | `open` / `closed` / etc. | Drives which P/L formula applies |

There is **no** separate `close_price`, `close_debit`, or `exit_price` column.

### Bug

1. **Close UI accepted per-contract debit** (0.514) but stored it directly in `exit_debit`, which expects **total** (51.40).
2. **Realized P/L** = 113.51 − 0.514 ≈ **113.00** (premium minus tiny “total”).
3. When `exit_debit` was missing, closed trades **fell back to `currentPnl`** (= premium with no manual option value).

---

## Fix

### Exit debit semantics (`lib/trades/exit-debit.ts`)

| Function | Purpose |
|----------|---------|
| `calculateExitDebitTotal(perContract, contracts)` | UI → DB: `perContract × 100 × contracts` |
| `deriveExitDebitPerContract(total, contracts)` | DB → UI display |
| `resolveStoredExitDebitTotal(stored, premiumPerContract, contracts)` | Legacy repair when per-contract was stored in `exit_debit` |
| `buildCloseTradePreview(...)` | Live close preview |

**Storage format (B):** `exit_debit` = total closing cost USD  
**UI input format (A):** per-contract closing debit

### Closed P/L formula (credit strategies — unchanged logic, fixed inputs)

```
Realized P/L = Premium Received − Closing Debit Total
Closing Debit Total = close_price_per_contract × 100 × contracts
```

Open trades unchanged:

```
Unrealized P/L = Premium Received − Current Option Value (total)
```

### Close flow

- `closeOptionsTrade(tradeId, exitDebitPerContract)` converts to total before persist.
- **Trade Detail Drawer** close panel shows:
  - Closing Debit Per Contract
  - Contracts
  - Premium Received
  - Total Closing Cost
  - Estimated Net P/L (live preview)

### Display

- Closed rows use **`realizedPnl`** via `calculateTotalTradePnL()` / `pnlAllocation`.
- Closed trades **no longer fall back** to open `currentPnl` when `realizedPnl` is null.
- Drawer shows Closing Debit / Contract + Total Closing Cost for closed trades.

### Dashboard summary cards (verified)

| Metric | Source |
|--------|--------|
| My Realized P/L | Sum of `realizedPnl` for **closed** trades (my share) |
| My Unrealized P/L | Sum of open trade unrealized P/L only |
| Premium Collected | Total credits from **all** trades (open + closed) |
| Win Rate | Based on realized P/L after closing debit |
| Open Risk | Open trades only |

---

## Monetary Precision (platform standard)

All monetary values display **exactly 2 decimal places**:

- `US$113.51`, `-US$43.40`, `+US$62.11`, `S$6,913.68`, `US$0.00`
- Core helpers: `formatMoney()`, `formatUsd()`, `formatSgd()`, `formatPnL()`, `getPnLColor()`
- See also: `MONETARY_PRECISION_STANDARDIZATION.md`

Percentages unchanged: `21.3%`, `-10.8%`, `0.0%`

---

## Verification — XSP Example

After fix (including legacy `exit_debit = 0.514` repair on read):

```
Premium Received     US$113.51
Closing Debit        US$51.40   (0.514 × 100 × 1)
Realized P/L         +US$62.11
My P/L               +US$62.11  (personal trade)
```

No longer shows +US$113.00 as profit.

---

## Tests

```bash
npm test -- lib/trades/exit-debit.test.ts lib/trades/pnl-allocation.test.ts
```

---

## Files Changed

- `lib/trades/exit-debit.ts` (new)
- `lib/trades/exit-debit.test.ts` (new)
- `lib/trades/map-trade.ts` — resolve exit debit on read; `exitDebitPerContract` on enrich
- `lib/trades/pnl-allocation.ts` — no open P/L fallback for closed
- `lib/trades/types.ts` — `exitDebitPerContract` on `EnrichedTrade`
- `app/actions/trades.ts` — close accepts per-contract debit
- `components/trades/TradeDetailDrawer.tsx` — close preview panel
- `components/trades/TradeFormModal.tsx` — per-contract exit debit on edit

---

## Build

```bash
npm run build
```

Exit code: **0** (passes)
