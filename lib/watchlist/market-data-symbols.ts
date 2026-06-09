/**
 * Watchlist ticker → external market data symbols.
 *
 * XSP = S&P 500 index proxy (^XSP, ~730–750). Manual S/R levels (700, 730, …)
 * use this scale — NOT iShares Core S&P 500 ETF on TSX (XSP.TO ~74 CAD).
 */

export function toYahooSymbol(ticker: string): string {
  const normalized = ticker.trim().toUpperCase();

  if (normalized === "XSP") return "^XSP";
  if (normalized === "BRK.B" || normalized === "BRKB") return "BRK-B";
  if (normalized === "DBS" || normalized === "D05") return "D05.SI";
  if (normalized === "C38U") return "C38U.SI";
  if (normalized === "A17U") return "A17U.SI";
  if (normalized === "ES3") return "ES3.SI";
  if (normalized.endsWith(".SI")) return normalized;

  return normalized.replace(/\./g, "-");
}

/** FMP stable EOD symbol — mirrors Yahoo index mapping where needed. */
export function toFmpSymbol(ticker: string): string {
  const normalized = ticker.trim().toUpperCase();

  if (normalized === "XSP") return "^XSP";
  if (normalized === "BRK.B" || normalized === "BRKB") return "BRK-B";

  return normalized.replace(/\./g, "-");
}
