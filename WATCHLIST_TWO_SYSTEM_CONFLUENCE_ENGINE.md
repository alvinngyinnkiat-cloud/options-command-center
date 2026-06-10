# Watchlist Two-System Confluence Engine

## Overview

The Watchlist Scanner runs **two independent decision engines** plus an **informational confluence layer** on each completed daily candle:

| Engine | Purpose | Output |
|--------|---------|--------|
| **System 1 — 20 EMA (Shorter-DTE)** | Early reversal setups | Sell Put · Sell Call · No Trade |
| **System 2 — Main Trading** | High-probability premium selling | Sell Put · Sell Call · Iron Condor · No Trade |
| **System 3 — Confluence** | Agreement between systems (informational only) | 0–10 score + status |

**Removed from Watchlist Scanner** (Risk Dashboard only):

- Trade Readiness Score
- Trade Readiness Checklist
- Liquidity / Capacity / No Active Trade / Market Condition checklists
- Final decision override logic driven by confluence or readiness

All scoring uses **Average Price = (High + Low) / 2** from the completed candle — never current/live price.

**Refresh schedule:**

- US stocks / ETFs: 6:00 AM SGT
- SG stocks: 5:30 PM SGT

---

## System 1 — 20 EMA Shorter-DTE

**File:** `lib/watchlist/trading-systems/ema-reversal-system.ts`

Operates **independently**. Never outputs Iron Condor.

### Inputs

Completed daily candle only: High, Low, Average Price, EMA20, Stochastic, Daily/Weekly Support & Resistance.

### Sell Put

1. Average price near support or mid-support zone
2. Average price near or below EMA20
3. Stochastic turning upward

### Sell Call

1. Average price near resistance or mid-resistance zone
2. Average price near or above EMA20
3. Stochastic turning downward

### No Trade

Not near S/R, stochastic not confirming, or **EMA Score &lt; 75**.

### EMA Score (0–100) — gates System 1 decision

| Range | Tier |
|-------|------|
| 90–100 | Elite Reversal |
| 85–89 | Strong Reversal |
| 80–84 | Good Reversal |
| 75–79 | Tradable Reversal |
| &lt; 75 | No Trade (decision forced to No Trade) |

Factors: distance from EMA20, support/resistance proximity, stochastic direction, trend alignment.

---

## System 2 — Main Trading

**File:** `lib/watchlist/trading-systems/main-trading-system.ts`

Operates **independently**. Primary workflow system.

### Sell Put

- Bullish trend
- Stochastic &lt; 25
- Near support

### Sell Call

- Stochastic &gt; 75
- Near resistance

### Iron Condor

- Between support and resistance
- Stochastic 40–60 (neutral; bullish trend not over-weighted)

### Strategy Fit Score (0–100) — gates System 2 decision

| Range | Tier |
|-------|------|
| 90–100 | Elite Setup |
| 85–89 | A Setup |
| 80–84 | Good Setup |
| 75–79 | Tradable Setup |
| &lt; 75 | No Trade (decision forced to No Trade) |

---

## System 3 — Confluence (Informational Only)

**File:** `lib/watchlist/trading-systems/confluence-engine.ts`

Confluence **does not override** either system's decision.

| Score | Status |
|-------|--------|
| 10/10 | STRONG AGREEMENT — both systems same direction |
| 8–9/10 | GOOD AGREEMENT |
| 7/10 | SHORTER-DTE ONLY — 20 EMA active, Main on sidelines |
| 6/10 | MAIN SYSTEM ONLY — Main active, 20 EMA on sidelines |
| 0–5/10 | CONFLICTING SIGNALS |

---

## Scanner Table Columns

| Column |
|--------|
| Ticker |
| 20 EMA Decision |
| EMA Score |
| Main Decision |
| Strategy Fit Score |
| Confluence Score |
| Confluence Status |
| Decision Reason |
| Final Rank |

### Sort order

1. Strategy Fit Score (primary)
2. Confluence Score
3. EMA Score

---

## Code Map

```
lib/watchlist/trading-systems/
  types.ts                 — shared types
  shared.ts                — S/R zones, EMA proximity, stochastic helpers
  ema-reversal-system.ts   — System 1
  main-trading-system.ts   — System 2
  confluence-engine.ts     — System 3
  index.ts                 — orchestrator + decisionReason
  legacy-bridge.ts         — legacy Bull Put / Bear Call labels
  compute.ts               — (via index)

lib/watchlist/scoring/map-row.ts  — wires systems into scanner rows
```

---

## Validation Checklist

1. Trade Readiness Score removed from Watchlist Scanner UI
2. 20 EMA System operates independently
3. Main System operates independently
4. 20 EMA never outputs Iron Condor
5. Main System can output Iron Condor
6. EMA Score gates only 20 EMA decisions (≥ 75)
7. Strategy Fit Score gates only Main decisions (≥ 75)
8. Confluence is informational only
9. Support/Resistance remains primary framework
10. EMA20 = reversal confirmation; Stochastic = direction confirmation
11. Existing ticker data preserved
12. `npm run build` passes

---

## Examples

### Strong agreement

- 20 EMA: Sell Put (92)
- Main: Sell Put (88)
- Confluence: 10/10 — STRONG AGREEMENT

### Shorter-DTE only

- 20 EMA: Sell Put (89)
- Main: No Trade (70)
- Confluence: 7/10 — SHORTER-DTE ONLY

### Main system only

- 20 EMA: No Trade (40)
- Main: Iron Condor (91)
- Confluence: 6/10 — MAIN SYSTEM ONLY
