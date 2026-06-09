import { describe, expect, it } from "vitest";
import { toYahooSymbol } from "@/lib/watchlist/yahoo-market-data-provider";

describe("toYahooSymbol", () => {
  it("maps XSP to Toronto listing", () => {
    expect(toYahooSymbol("XSP")).toBe("XSP.TO");
  });

  it("maps BRK.B to BRK-B", () => {
    expect(toYahooSymbol("BRK.B")).toBe("BRK-B");
    expect(toYahooSymbol("BRKB")).toBe("BRK-B");
  });

  it("keeps GOOG and GOOGL as separate symbols", () => {
    expect(toYahooSymbol("GOOG")).toBe("GOOG");
    expect(toYahooSymbol("GOOGL")).toBe("GOOGL");
  });

  it("passes through US tickers unchanged", () => {
    expect(toYahooSymbol("QQQ")).toBe("QQQ");
    expect(toYahooSymbol(" goog ")).toBe("GOOG");
  });
});
