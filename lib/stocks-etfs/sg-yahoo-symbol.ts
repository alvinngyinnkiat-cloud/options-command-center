/**
 * Singapore (SGX) ticker → Yahoo Finance symbol mapping.
 * US tickers pass through via toYahooSymbol in watchlist provider.
 */
const SG_YAHOO_SYMBOL_MAP: Record<string, string> = {
  DBS: "D05.SI",
  D05: "D05.SI",
  C38U: "C38U.SI",
  A17U: "A17U.SI",
  ES3: "ES3.SI",
};

export function toSgYahooSymbol(ticker: string): string {
  const normalized = ticker.trim().toUpperCase();
  if (SG_YAHOO_SYMBOL_MAP[normalized]) {
    return SG_YAHOO_SYMBOL_MAP[normalized]!;
  }
  if (normalized.endsWith(".SI")) return normalized;
  return `${normalized}.SI`;
}

export function isSgTicker(ticker: string): boolean {
  const normalized = ticker.trim().toUpperCase();
  return (
    normalized in SG_YAHOO_SYMBOL_MAP ||
    normalized.endsWith(".SI") ||
    /^[A-Z0-9]{2,5}$/.test(normalized)
  );
}
