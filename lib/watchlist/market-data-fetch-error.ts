export class MarketDataFetchError extends Error {
  readonly ticker: string;
  readonly fmpError: string | null;
  readonly yahooError: string | null;

  constructor(ticker: string, fmpError: string | null, yahooError: string | null) {
    const parts: string[] = [];
    if (fmpError) parts.push(`FMP: ${fmpError}`);
    if (yahooError) parts.push(`Yahoo: ${yahooError}`);
    super(`${ticker}: ${parts.join(" | ") || "Both providers failed"}`);
    this.name = "MarketDataFetchError";
    this.ticker = ticker;
    this.fmpError = fmpError;
    this.yahooError = yahooError;
  }
}
