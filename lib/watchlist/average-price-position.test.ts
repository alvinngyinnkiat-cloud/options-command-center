import { describe, expect, it } from "vitest";
import {
  buildAveragePricePosition,
  calculateAveragePricePositionPct,
  getAveragePricePositionZone,
} from "./average-price-position";

describe("average price position", () => {
  it("calculates position within S/R range", () => {
    expect(calculateAveragePricePositionPct(100, 90, 110)).toBe(50);
    expect(calculateAveragePricePositionPct(90, 90, 110)).toBe(0);
    expect(calculateAveragePricePositionPct(110, 90, 110)).toBe(100);
  });

  it("returns null when S/R missing", () => {
    expect(calculateAveragePricePositionPct(100, null, 110)).toBeNull();
  });

  it("assigns color zones", () => {
    expect(getAveragePricePositionZone(10)).toBe("support");
    expect(getAveragePricePositionZone(50)).toBe("mid");
    expect(getAveragePricePositionZone(90)).toBe("resistance");
  });

  it("builds display label", () => {
    expect(buildAveragePricePosition(90, 90, 110).label).toBe("At Support");
    expect(buildAveragePricePosition(100, 90, 110).label).toBe("Mid Range");
    expect(buildAveragePricePosition(110, 90, 110).label).toBe("At Resistance");
  });
});
