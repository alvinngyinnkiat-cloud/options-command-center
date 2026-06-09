# Closed Trade Broker Reconciliation Fix

## Problem

Closed XSP trades showed higher realized P/L than Excel/broker because the app used:

```
Premium Received − Closing Debit
```

Brokers report:

```
Premium Received − Closing Debit − Fees/Commission
```

Typical differences were ~US$0.49–0.58 per trade (round-trip commissions).

## Solution

### Database (`options_trades`)

| Column | Purpose |
|--------|---------|
| `fees_commission` | Round-trip fees/commission (USD), default 0 |
| `broker_realized_pnl` | Manual broker P/L override (USD), nullable |

Migration: `20260608190000_closed_trade_fees_broker_pnl.sql`

### P/L formulas

**Calculated realized P/L (credit strategies):**

```
Premium Received − Total Closing Debit − Fees/Commission
```

**Final realized P/L:**

```
broker_realized_pnl ?? calculatedRealizedPnl
```

When a broker override is entered, it becomes the displayed and persisted P/L. Dashboard summaries, client profit-sharing allocations, and closed-trade stats all use this final value via `calculations.realizedPnl` and `realized_pnl` column.

### UI

**Close Trade panel** (trade detail drawer):

- Premium Received
- Closing Debit Per Contract
- Contracts
- Total Closing Debit
- Fees / Commission
- Calculated Realized P/L
- Estimated Net P/L

**Closed trade view / edit** (detail drawer + edit modal):

- All closing fields above
- Broker Realized P/L Override
- Final Realized P/L (uses override when set)

### Field mapping

| User term | DB / code |
|-----------|-----------|
| Premium Received | `credit_received` × 100 × `contracts` |
| Closing Debit Per Contract | Derived from `exit_debit` total |
| Total Closing Debit | `exit_debit` (total USD) |
| Fees/Commission | `fees_commission` |
| Broker Realized P/L | `broker_realized_pnl` |

There is no separate `close_price` or `premium_received` column — premium is stored per-contract in `credit_received`.

## Files changed

| File | Change |
|------|--------|
| `supabase/migrations/20260608190000_closed_trade_fees_broker_pnl.sql` | New columns |
| `lib/trades/realized-pnl.ts` | Core reconciliation logic |
| `lib/trades/realized-pnl.test.ts` | Unit tests |
| `lib/trades/calculations.ts` | Fees + broker override in `buildTradeCalculations` |
| `lib/trades/exit-debit.ts` | Optional fees in close preview |
| `lib/trades/map-trade.ts` | Read/write new fields |
| `lib/trades/types.ts` | Type updates |
| `types/database.ts` | `OptionsTrade` schema |
| `app/actions/trades.ts` | `closeOptionsTrade` accepts fees |
| `components/trades/TradeDetailDrawer.tsx` | Close + closed reconciliation UI |
| `components/trades/TradeFormModal.tsx` | Edit closed trade fees/override |

## Build

```bash
npm run build
```

Verified after this update.

## Usage

1. When closing a trade, enter **Fees / Commission** (e.g. `0.49`).
2. If calculated P/L still differs from broker, enter **Broker Realized P/L Override** (e.g. `62.02`).
3. Save — dashboard and client split use the final P/L automatically.
