import { describe, expect, it } from "vitest";
import { buildImportPreview, normalizeStrategy } from "./validate";

describe("import-export validate", () => {
  it("normalizes strategy aliases", () => {
    expect(normalizeStrategy("Iron Condor")).toBe("iron_condor");
    expect(normalizeStrategy("bull put spread")).toBe("bull_put_spread");
  });

  it("detects duplicates in portfolio import", () => {
    const rows = [
      {
        Ticker: "AAPL",
        "Asset Type": "stock",
        Currency: "USD",
        Shares: "10",
        "Cost Basis": "1000",
        "Current Value": "1200",
      },
      {
        Ticker: "MSFT",
        "Asset Type": "stock",
        Currency: "USD",
        Shares: "5",
        "Cost Basis": "500",
        "Current Value": "600",
      },
    ];
    const preview = buildImportPreview(
      "portfolio_holdings",
      rows,
      new Set(["AAPL|stock"])
    );
    expect(preview.validCount).toBe(1);
    expect(preview.duplicateCount).toBe(1);
    expect(preview.errorCount).toBe(0);
  });

  it("flags invalid options row", () => {
    const preview = buildImportPreview("options_trades", [
      {
        Underlying: "",
        Strategy: "bad",
        "Entry Date": "",
        "Expiry Date": "",
        Contracts: "0",
        Strikes: "",
        Premium: "",
        "Max Risk": "",
        Status: "invalid",
      },
    ], new Set());
    expect(preview.errorCount).toBe(1);
    expect(preview.validCount).toBe(0);
  });
});
