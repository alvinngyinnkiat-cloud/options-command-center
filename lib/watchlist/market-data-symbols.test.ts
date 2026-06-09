import { describe, expect, it } from "vitest";
import { toFmpSymbol, toYahooSymbol } from "@/lib/watchlist/market-data-symbols";

describe("market-data-symbols", () => {
  it("maps XSP to ^XSP on Yahoo and FMP", () => {
    expect(toYahooSymbol("XSP")).toBe("^XSP");
    expect(toFmpSymbol("XSP")).toBe("^XSP");
  });

  it("does not map XSP to XSP.TO", () => {
    expect(toYahooSymbol("XSP")).not.toBe("XSP.TO");
  });
});
