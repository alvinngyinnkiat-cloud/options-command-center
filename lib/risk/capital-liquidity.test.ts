import { describe, expect, it } from "vitest";
import {
  buildCapitalLiquidityCheck,
  calculateCapitalUtilizationPct,
  calculateLiquidityRatio,
  calculateUsdTradingBuyingPower,
  extractCashBalances,
  getCapitalLiquidityStatus,
  getStressTestStatus,
} from "./capital-liquidity";
import type { CapitalLiquidityBase } from "./capital-liquidity";
import type { HoldingInput } from "@/lib/portfolio/types";

const base: CapitalLiquidityBase = {
  portfolioValue: 400_000,
  tradingCapital: 350_000,
  usStocksOptionsValueUsd: 200_000,
  stocksEtfValue: 200_000,
  cryptoValue: 50_000,
  cash: {
    cashSgd: 30_000,
    cashUsdNative: 10_000,
    cashUsdSgd: 13_500,
    cashAvailable: 43_500,
    tradingCashSgd: 43_500,
    cryptoCashSgd: 0,
  },
  usdTradingBuyingPower: -40_000,
  currentOpenRisk: 50_000,
  currentPositionMarketValue: 15_000,
  currentPositionCloseRequirement: 15_000,
  openTradesCount: 5,
  maximumOptionsCapital: 300_000,
  availableRiskCapacity: 250_000,
  maximumRiskPerTrade: 6_250,
};

describe("capital liquidity", () => {
  it("extracts cash balances from holdings", () => {
    const holdings: HoldingInput[] = [
      {
        ticker: "CASH",
        asset_type: "other",
        currency: "SGD",
        market_value_native: 12_000,
        fx_rate_to_sgd: 1,
        market_value_sgd: 12_000,
        market_value: 12_000,
        cost_basis: null,
      },
      {
        ticker: "CASH.USD",
        asset_type: "other",
        currency: "USD",
        market_value_native: 18_000,
        fx_rate_to_sgd: 1.35,
        market_value_sgd: 24_300,
        market_value: 24_300,
        cost_basis: null,
      },
    ];
    const cash = extractCashBalances(holdings);
    expect(cash.cashSgd).toBe(12_000);
    expect(cash.cashUsdNative).toBe(18_000);
    expect(cash.cashAvailable).toBe(36_300);
  });

  it("calculates USD trading buying power", () => {
    expect(calculateUsdTradingBuyingPower(25_000, 8_000)).toBe(17_000);
    expect(calculateUsdTradingBuyingPower(5_000, 12_000)).toBe(-7_000);
  });

  it("calculates liquidity ratio", () => {
    expect(calculateLiquidityRatio(30_000, 15_000)).toBe(2);
  });

  it("calculates capital utilization", () => {
    expect(calculateCapitalUtilizationPct(50_000, 5_000, 200_000)).toBeCloseTo(
      27.5,
      1
    );
  });

  it("assigns safe status", () => {
    expect(
      getCapitalLiquidityStatus({
        liquidityRatio: 2.5,
        emergencyBuffer: 10_000,
        capitalUtilizationPct: 45,
      })
    ).toBe("safe");
  });

  it("assigns danger when liquidity ratio below 1", () => {
    expect(
      getCapitalLiquidityStatus({
        liquidityRatio: 0.8,
        emergencyBuffer: -5_000,
        capitalUtilizationPct: 80,
      })
    ).toBe("danger");
  });

  it("builds full capital liquidity check", () => {
    const result = buildCapitalLiquidityCheck(base, 5_000);
    expect(result.stockDeployableCapital).toBe(150_000);
    expect(result.remainingCapitalAfterNewTrade).toBe(145_000);
    expect(result.emergencyBuffer).toBe(28_500);
    expect(result.tradeEligible).toBe(true);
    expect(result.canCloseAllPositions).toBe(true);
  });

  it("stress test underfunded when remaining negative", () => {
    expect(getStressTestStatus(-1_000, 0.5)).toBe("underfunded");
  });
});
