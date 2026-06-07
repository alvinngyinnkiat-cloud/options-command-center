import type { MarketCapSnapshot } from "@/lib/auto-watchlist/types";

function snap(
  partial: Omit<MarketCapSnapshot, "fiftyTwoWeekHigh" | "fiftyTwoWeekLow"> & {
    highPct?: number;
    lowPct?: number;
  }
): MarketCapSnapshot {
  const highPct = partial.highPct ?? 1.12;
  const lowPct = partial.lowPct ?? 0.82;
  const { highPct: _h, lowPct: _l, ...rest } = partial;
  return {
    ...rest,
    fiftyTwoWeekHigh: Math.round(rest.currentPrice * highPct * 100) / 100,
    fiftyTwoWeekLow: Math.round(rest.currentPrice * lowPct * 100) / 100,
  };
}

/** Broad US equity universe for auto-watchlist screening (mock). */
export const MOCK_MARKET_CAP_UNIVERSE: MarketCapSnapshot[] = [
  snap({ ticker: "AAPL", companyName: "Apple Inc.", marketCapBillions: 3420, sector: "Technology", currentPrice: 221.5, oneYearPerformancePercent: 18.4 }),
  snap({ ticker: "MSFT", companyName: "Microsoft Corp.", marketCapBillions: 3180, sector: "Technology", currentPrice: 428.2, oneYearPerformancePercent: 22.1 }),
  snap({ ticker: "NVDA", companyName: "NVIDIA Corp.", marketCapBillions: 2980, sector: "Technology", currentPrice: 121.8, oneYearPerformancePercent: 145.2 }),
  snap({ ticker: "GOOGL", companyName: "Alphabet Inc.", marketCapBillions: 2150, sector: "Technology", currentPrice: 174.6, oneYearPerformancePercent: 31.5 }),
  snap({ ticker: "AMZN", companyName: "Amazon.com Inc.", marketCapBillions: 1980, sector: "Consumer", currentPrice: 188.4, oneYearPerformancePercent: 42.8 }),
  snap({ ticker: "META", companyName: "Meta Platforms", marketCapBillions: 1420, sector: "Technology", currentPrice: 562.1, oneYearPerformancePercent: 58.3 }),
  snap({ ticker: "BRK.B", companyName: "Berkshire Hathaway", marketCapBillions: 910, sector: "Financials", currentPrice: 462.3, oneYearPerformancePercent: 12.6 }),
  snap({ ticker: "LLY", companyName: "Eli Lilly", marketCapBillions: 780, sector: "Healthcare", currentPrice: 842.5, oneYearPerformancePercent: 35.2 }),
  snap({ ticker: "AVGO", companyName: "Broadcom Inc.", marketCapBillions: 720, sector: "Technology", currentPrice: 168.4, oneYearPerformancePercent: 48.9 }),
  snap({ ticker: "JPM", companyName: "JPMorgan Chase", marketCapBillions: 580, sector: "Financials", currentPrice: 198.7, oneYearPerformancePercent: 28.4 }),
  snap({ ticker: "TSLA", companyName: "Tesla Inc.", marketCapBillions: 780, sector: "Consumer", currentPrice: 248.5, oneYearPerformancePercent: -8.2 }),
  snap({ ticker: "UNH", companyName: "UnitedHealth Group", marketCapBillions: 510, sector: "Healthcare", currentPrice: 548.2, oneYearPerformancePercent: -12.4 }),
  snap({ ticker: "XOM", companyName: "Exxon Mobil", marketCapBillions: 480, sector: "Energy", currentPrice: 112.8, oneYearPerformancePercent: 6.2 }),
  snap({ ticker: "V", companyName: "Visa Inc.", marketCapBillions: 560, sector: "Financials", currentPrice: 285.4, oneYearPerformancePercent: 14.8 }),
  snap({ ticker: "MA", companyName: "Mastercard Inc.", marketCapBillions: 470, sector: "Financials", currentPrice: 498.6, oneYearPerformancePercent: 19.3 }),
  snap({ ticker: "WMT", companyName: "Walmart Inc.", marketCapBillions: 620, sector: "Consumer", currentPrice: 92.4, oneYearPerformancePercent: 38.5 }),
  snap({ ticker: "JNJ", companyName: "Johnson & Johnson", marketCapBillions: 380, sector: "Healthcare", currentPrice: 158.2, oneYearPerformancePercent: -4.8 }),
  snap({ ticker: "PG", companyName: "Procter & Gamble", marketCapBillions: 390, sector: "Consumer", currentPrice: 168.5, oneYearPerformancePercent: 8.2 }),
  snap({ ticker: "HD", companyName: "Home Depot", marketCapBillions: 385, sector: "Consumer", currentPrice: 382.4, oneYearPerformancePercent: 22.1 }),
  snap({ ticker: "ORCL", companyName: "Oracle Corp.", marketCapBillions: 380, sector: "Technology", currentPrice: 138.6, oneYearPerformancePercent: 52.4 }),
  snap({ ticker: "ADBE", companyName: "Adobe Inc.", marketCapBillions: 195, sector: "Technology", currentPrice: 432.8, oneYearPerformancePercent: -18.6 }),
  snap({ ticker: "CRM", companyName: "Salesforce Inc.", marketCapBillions: 248, sector: "Technology", currentPrice: 258.4, oneYearPerformancePercent: -6.2 }),
  snap({ ticker: "NKE", companyName: "Nike Inc.", marketCapBillions: 118, sector: "Consumer", currentPrice: 72.4, oneYearPerformancePercent: -22.8 }),
  snap({ ticker: "INTC", companyName: "Intel Corp.", marketCapBillions: 98, sector: "Technology", currentPrice: 22.8, oneYearPerformancePercent: -48.2 }),
  snap({ ticker: "BA", companyName: "Boeing Co.", marketCapBillions: 112, sector: "Others", currentPrice: 178.5, oneYearPerformancePercent: -14.6 }),
  snap({ ticker: "PYPL", companyName: "PayPal Holdings", marketCapBillions: 72, sector: "Financials", currentPrice: 68.4, oneYearPerformancePercent: -28.4 }),
  snap({ ticker: "SBUX", companyName: "Starbucks Corp.", marketCapBillions: 98, sector: "Consumer", currentPrice: 86.2, oneYearPerformancePercent: -11.2 }),
  snap({ ticker: "ABNB", companyName: "Airbnb Inc.", marketCapBillions: 82, sector: "Consumer", currentPrice: 142.8, oneYearPerformancePercent: -9.8 }),
  snap({ ticker: "SNAP", companyName: "Snap Inc.", marketCapBillions: 18, sector: "Technology", currentPrice: 11.2, oneYearPerformancePercent: -32.4 }),
  snap({ ticker: "ROKU", companyName: "Roku Inc.", marketCapBillions: 9.8, sector: "Technology", currentPrice: 68.5, oneYearPerformancePercent: -24.6 }),
  snap({ ticker: "PLTR", companyName: "Palantir Technologies", marketCapBillions: 48, sector: "Technology", currentPrice: 22.4, oneYearPerformancePercent: 85.2 }),
  snap({ ticker: "COIN", companyName: "Coinbase Global", marketCapBillions: 42, sector: "Financials", currentPrice: 198.6, oneYearPerformancePercent: 62.4 }),
  snap({ ticker: "DKNG", companyName: "DraftKings Inc.", marketCapBillions: 22, sector: "Consumer", currentPrice: 32.8, oneYearPerformancePercent: -18.4 }),
  snap({ ticker: "RIVN", companyName: "Rivian Automotive", marketCapBillions: 12, sector: "Consumer", currentPrice: 11.4, oneYearPerformancePercent: -42.8 }),
  snap({ ticker: "LCID", companyName: "Lucid Group", marketCapBillions: 8.2, sector: "Consumer", currentPrice: 2.8, oneYearPerformancePercent: -58.2 }),
  snap({ ticker: "ENPH", companyName: "Enphase Energy", marketCapBillions: 14, sector: "Energy", currentPrice: 98.4, oneYearPerformancePercent: -38.6 }),
  snap({ ticker: "FSLR", companyName: "First Solar", marketCapBillions: 18, sector: "Energy", currentPrice: 198.2, oneYearPerformancePercent: -12.4 }),
  snap({ ticker: "MRNA", companyName: "Moderna Inc.", marketCapBillions: 28, sector: "Healthcare", currentPrice: 72.4, oneYearPerformancePercent: -26.8 }),
  snap({ ticker: "PFE", companyName: "Pfizer Inc.", marketCapBillions: 148, sector: "Healthcare", currentPrice: 26.2, oneYearPerformancePercent: -22.4 }),
  snap({ ticker: "DIS", companyName: "Walt Disney Co.", marketCapBillions: 198, sector: "Consumer", currentPrice: 98.4, oneYearPerformancePercent: -8.6 }),
];
