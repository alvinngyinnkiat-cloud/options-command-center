# Options Trading Command Center — Project Rules

> **Permanent rules for all development phases.**  
> Future phases MUST reference this file before implementing features, schema changes, or business logic.

---

## Support & Resistance

1. **Support and resistance are manual inputs only.**
2. **Never auto-generate support and resistance.**
3. **Use major Daily and Weekly support/resistance only.**

Support/resistance levels are entered by the user and stored permanently. No algorithm, scanner, or market data pipeline may create or overwrite these values.

---

## Primary Strategies

4. **Bull Put, Bear Call, and Iron Condor are the primary strategies.**

All trade tracking, scoring, and reporting should center on these three spread types.

---

## Trade Management Rules

5. **Take Profit = 75%**
6. **Stop Loss = 175%**
7. **Maximum Options Allocation = 75%**
8. **Maximum Risk Per Trade = 2.5%**

These defaults are stored in `risk_settings` and enforced in later phases.

---

## Default Watchlist

9. The default watchlist tickers are:

```
XSP, SPY, QQQ, IWM, GLD
JPM, CAT, WMT, UNH, XOM, HD
AAPL, MSFT, NVDA, AVGO, AMZN, META, GOOG
```

New users should be seeded with this watchlist unless they customize it.

---

## Phase Reference

| Phase | Scope |
|-------|-------|
| Phase 0 | Dashboard shell (complete) |
| Phase 1 | Supabase database architecture (complete) |
| Phase 2+ | Feature UI and logic — must comply with all rules above |

When in doubt, read this file first.
