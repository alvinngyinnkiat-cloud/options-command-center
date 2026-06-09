import { describe, expect, it } from "vitest";
import {
  applyComputedCryptoTotalsToOverride,
  computeCryptoTotalsFromRows,
} from "./sync-portfolio-totals";
import type { PortfolioOverrideInput } from "@/lib/portfolio/types";
import type { CryptoHolding } from "@/types/database";

const baseOverride: PortfolioOverrideInput = {
  useManualOverride: false,
  manualUsStocksOptionsValueUsd: null,
  manualUsStocksOptionsSgdEquivalent: null,
  manualCryptoValueSgd: null,
  manualSgStocksCashValueSgd: null,
  manualSgStocksValueSgd: null,
  manualSgCashValueSgd: null,
  manualTradingCashUsd: null,
  manualTradingCashSgd: null,
  manualCryptoCashSgd: 500,
  manualCryptoHoldingsSgd: null,
  manualCryptoContributionsSgd: null,
  manualClientPortfolioSgd: 0,
  manualUsdSgdRate: 1.35,
  manualTotalPortfolioValueSgd: null,
  overrideReason: null,
  overrideUpdatedAt: null,
};

function row(ticker: string, value: number): CryptoHolding {
  return {
    id: ticker,
    user_id: "u",
    asset_label: ticker,
    ticker,
    total_invested_sgd: value,
    current_value_sgd: value,
    notes: null,
    last_updated: "2026-06-08",
    created_at: "",
    updated_at: "",
  };
}

describe("sync portfolio crypto totals", () => {
  it("sums individual coin values for coin holdings total", () => {
    const totals = computeCryptoTotalsFromRows(
      [row("BTC", 4_000), row("ETH", 2_000), row("USDT", 1_000)],
      500
    );

    expect(totals.cryptoHoldingsSgd).toBe(7_000);
    expect(totals.cryptoPortfolioValueSgd).toBe(7_500);
  });

  it("writes computed totals back to override fields", () => {
    const synced = applyComputedCryptoTotalsToOverride(
      baseOverride,
      [row("BTC", 4_000), row("ETH", 2_000), row("USDT", 1_000)],
      500
    );

    expect(synced.manualCryptoHoldingsSgd).toBe(7_000);
    expect(synced.manualCryptoValueSgd).toBe(7_500);
    expect(synced.manualCryptoCashSgd).toBe(500);
  });
});
