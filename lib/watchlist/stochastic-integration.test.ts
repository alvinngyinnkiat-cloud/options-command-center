import { describe, expect, it } from "vitest";
import { buildStochasticDebug } from "./compute-indicators";
import { fetchDailyCandlesForTicker } from "./market-data-provider";
import { getWatchlistHistoryRange } from "./market-data-sync-range";

describe("IWM stochastic vs TradingView (integration)", () => {
  it.skipIf(!process.env.RUN_MARKET_INTEGRATION)(
    "matches TradingView fast %K within ±1 point for IWM",
    async () => {
      const tradingViewSo = Number(process.env.TRADINGVIEW_IWM_SO ?? "48.51");
      const { from, to, completedCandleDate } = getWatchlistHistoryRange();
      const { candles } = await fetchDailyCandlesForTicker("IWM", from, to);
      const eligible = candles.filter((c) => c.date <= completedCandleDate);
      const debug = buildStochasticDebug(eligible, "IWM");

      expect(debug).not.toBeNull();
      expect(debug!.soLength).toBe(10);
      expect(debug!.soSmoothing).toBe(3);
      expect(debug!.soValue).toBeCloseTo(debug!.rawK, 5);
      expect(Math.abs(debug!.soValue - tradingViewSo)).toBeLessThanOrEqual(1);
    },
    30_000
  );
});
