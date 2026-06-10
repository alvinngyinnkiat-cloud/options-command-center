# Watchlist Two-System Confluence Engine

## Overview

The Watchlist Scanner runs **three independent engines** on each completed daily candle:

| Engine | Purpose | Output |
|--------|---------|--------|
| **System 1 — 20 EMA Reversal** | Early reversal setups | Sell Put · Sell Call · No Trade |
| **System 2 — Main Trading** | High-probability premium selling | Sell Put · Sell Call · Iron Condor · No Trade |
| **System 3 — Confluence** | Agreement ranking | 0–10 score + status tier |

All scoring uses **Average Price = (High + Low) / 2** from the completed candle — never current/live price.

---

## System 1 — 20 EMA Reversal

**File:** `lib/watchlist/trading-systems/ema-reversal-system.ts`

### Sell Put
1. Average price near support or mid-support zone (lower 50% of S/R range)
2. Average price below or near EMA20 (within ±2.5%)
3. Stochastic turning upward (today > previous)

### Sell Call
1. Average price near resistance or mid-resistance zone (upper 50%)
2. Average price above or near EMA20
3. Stochastic turning downward

### No Trade
Any rule fails, or setup is ambiguous.

**Never outputs Iron Condor.**

### EMA Score (0–100)
| Range | Tier |
|-------|------|
| 90–100 | Strong Reversal |
| 75–89 | Good Reversal |
| 60–74 | Watchlist |
| < 60 | Ignore |

Factors: EMA20 proximity, S/R ATR-adjusted zone, stochastic direction, trend alignment.

---

## System 2 — Main Trading

**File:** `lib/watchlist/trading-systems/main-trading-system.ts`

### Sell Put
- Bullish trend (avg > SMA200, SMA50 > SMA200, SMA50 rising)
- Stochastic < 25
- Near support zone

### Sell Call
- Bearish trend
- Stochastic > 75
- Near resistance zone

### Iron Condor
- Between support and resistance
- Stochastic 40–60

### Main Score (0–100)
| Range | Tier |
|-------|------|
| 90–100 | A+ Setup |
| 80–89 | A Setup |
| 70–79 | B Setup |
| < 70 | Pass |

---

## System 3 — Confluence

**File:** `lib/watchlist/trading-systems/confluence-engine.ts`

| Score | Status | Condition |
|-------|--------|-----------|
| **10/10** | STRONG CONFLUENCE | Both systems same active recommendation |
| **8–9/10** | GOOD CONFLUENCE | Same direction, different active labels |
| **7/10** | EARLY SETUP | One system trades, other No Trade |
| **6/10** | NEUTRAL | EMA No Trade + Main Iron Condor |
| **0–5/10** | CONFLICTING SIGNALS | Bullish vs bearish disagreement |

### Priority Tiers
- **Tier 1:** Confluence 10 — highest priority
- **Tier 2:** Confluence 8–9 — strong candidate
- **Tier 3:** Confluence 7 — watchlist candidate
- **Tier 4:** Confluence ≤ 6 — no immediate action

---

## Trade Queue Sort Order

1. Confluence score (desc)
2. Main trade score (desc)
3. EMA score (desc)

**File:** `lib/trading-workflow/trade-queue.ts`

---

## Legacy Scoring (Component Breakdown)

The original weighted components (Trend 35, Stochastic 25, S/R 20) remain for **breakdown display only**.

**EMA20 is removed from the legacy component total** — it is scored exclusively in System 1.

**File:** `lib/watchlist/scoring/compute.ts`

---

## UI Surfaces

| View | Columns |
|------|---------|
| Scanner grid | Ticker · EMA System · EMA Score · Main System · Main Score · Confluence |
| Full table | Dual Trading Systems section |
| Detail cards | Section 6: Dual System Scores |
| Category table | Main System · Confluence |

---

## Key Files

```
lib/watchlist/trading-systems/
  types.ts
  shared.ts
  ema-reversal-system.ts
  main-trading-system.ts
  confluence-engine.ts
  legacy-bridge.ts
  compute.ts
  index.ts
  trading-systems.test.ts

lib/watchlist/scoring/map-row.ts      — orchestrates all engines per row
lib/watchlist/scanner-result.ts       — ScannerScoreResult.tradingSystems
```

---

## Refresh Schedule (unchanged)

- US stocks/ETFs: 6:00 AM SGT (`vercel.json` cron 22:00 UTC)
- SG stocks: 5:30 PM SGT
- Completed daily candles only

---

## Validation Checklist

- [x] 20 EMA system never outputs Iron Condor
- [x] Main system can output Iron Condor
- [x] Average price = (High + Low) / 2
- [x] S/R remains primary decision framework
- [x] EMA20 acts as reversal confirmation (System 1 only)
- [x] Stochastic confirms direction in System 1
- [x] Scanner displays both systems separately
- [x] Trade queue sorts by confluence first
