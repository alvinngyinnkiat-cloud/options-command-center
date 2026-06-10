import { describe, expect, it } from "vitest";
import {
  classifyStochasticMomentum,
  emaSystemStochasticScore,
  mainSystemStochasticScore,
} from "./stochastic-momentum";

describe("classifyStochasticMomentum", () => {
  it("XSP 14.7 -> 38.9 = ROLLING UP", () => {
    expect(classifyStochasticMomentum(38.9, 14.7)).toBe("ROLLING UP");
  });

  it("IWM 31.1 -> 48.5 = STRONG", () => {
    expect(classifyStochasticMomentum(48.5, 31.1)).toBe("STRONG");
  });

  it("82 -> 69 = ROLLING DOWN", () => {
    expect(classifyStochasticMomentum(69, 82)).toBe("ROLLING DOWN");
  });

  it("previous null defaults to STRONG", () => {
    expect(classifyStochasticMomentum(50, null)).toBe("STRONG");
  });
});

describe("mainSystemStochasticScore", () => {
  it("Bull Put rolling up = 25", () => {
    expect(
      mainSystemStochasticScore("Sell Put", "ROLLING UP", 38.9)
    ).toBe(25);
  });

  it("Iron Condor SO 40-60 = 25", () => {
    expect(mainSystemStochasticScore("Iron Condor", "STRONG", 50)).toBe(25);
  });

  it("Iron Condor SO 35-65 = 15", () => {
    expect(mainSystemStochasticScore("Iron Condor", "STRONG", 62)).toBe(15);
  });
});

describe("emaSystemStochasticScore", () => {
  it("Sell Put rolling up = 30", () => {
    expect(emaSystemStochasticScore("Sell Put", "ROLLING UP")).toBe(30);
  });

  it("Sell Call rolling down = 30", () => {
    expect(emaSystemStochasticScore("Sell Call", "ROLLING DOWN")).toBe(30);
  });
});
