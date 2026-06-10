import { describe, expect, it } from "vitest";
import {
  cryptoRowFromForm,
  prepareCryptoHoldingFormForSave,
} from "./map-holding";
import type { CryptoHoldingFormInput } from "./types";

const baseForm: CryptoHoldingFormInput = {
  assetLabel: "BTC",
  ticker: "BTC",
  totalInvestedSgd: 1000,
  currentValueSgd: 0,
  notes: "closed",
  lastUpdated: "2025-01-15",
};

describe("prepareCryptoHoldingFormForSave", () => {
  it("preserves closed date when current value is zero", () => {
    const result = prepareCryptoHoldingFormForSave(baseForm, "2025-01-15");
    expect(result.lastUpdated).toBe("2025-01-15");
  });

  it("sets last updated to today when reopening (current > 0)", () => {
    const today = new Date().toISOString().split("T")[0];
    const result = prepareCryptoHoldingFormForSave(
      { ...baseForm, currentValueSgd: 500 },
      "2025-01-15"
    );
    expect(result.lastUpdated).toBe(today);
  });
});

describe("cryptoRowFromForm", () => {
  it("persists lastUpdated from form input", () => {
    const row = cryptoRowFromForm(
      { ...baseForm, lastUpdated: "2025-03-01" },
      "user-1"
    );
    expect(row.last_updated).toBe("2025-03-01");
    expect(row.current_value_sgd).toBe(0);
  });
});
