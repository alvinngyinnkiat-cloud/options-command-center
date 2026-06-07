/**
 * Dividend data providers: FMP (primary), Alpha Vantage (fallback), Mock.
 */

export interface ProviderDividendEvent {
  ticker: string;
  exDividendDate: string | null;
  recordDate: string | null;
  paymentDate: string | null;
  dividendPerShare: number;
  apiReferenceId: string;
}

export interface DividendProviderResult {
  events: ProviderDividendEvent[];
  source: "fmp" | "alpha_vantage" | "mock";
}

export interface DividendDataProvider {
  readonly name: "fmp" | "alpha_vantage" | "mock";
  fetchHistoricalDividends(
    ticker: string,
    from?: string,
    to?: string
  ): Promise<ProviderDividendEvent[]>;
  fetchDividendCalendar?(
    from: string,
    to: string
  ): Promise<ProviderDividendEvent[]>;
}

const MOCK_DIVIDENDS: Record<string, ProviderDividendEvent[]> = {
  SPY: [
    {
      ticker: "SPY",
      exDividendDate: "2026-03-20",
      recordDate: "2026-03-21",
      paymentDate: "2026-04-30",
      dividendPerShare: 1.58,
      apiReferenceId: "mock-spy-2026-q1",
    },
    {
      ticker: "SPY",
      exDividendDate: "2025-12-20",
      recordDate: "2025-12-21",
      paymentDate: "2026-01-31",
      dividendPerShare: 1.63,
      apiReferenceId: "mock-spy-2025-q4",
    },
  ],
  AAPL: [
    {
      ticker: "AAPL",
      exDividendDate: "2026-02-10",
      recordDate: "2026-02-11",
      paymentDate: "2026-02-14",
      dividendPerShare: 0.25,
      apiReferenceId: "mock-aapl-2026-q1",
    },
  ],
  DBS: [
    {
      ticker: "DBS",
      exDividendDate: "2026-04-15",
      recordDate: "2026-04-16",
      paymentDate: "2026-04-28",
      dividendPerShare: 0.54,
      apiReferenceId: "mock-dbs-2026",
    },
  ],
};

export class MockDividendDataProvider implements DividendDataProvider {
  readonly name = "mock" as const;

  async fetchHistoricalDividends(
    ticker: string,
    _from?: string,
    _to?: string
  ): Promise<ProviderDividendEvent[]> {
    return MOCK_DIVIDENDS[ticker.toUpperCase()] ?? [];
  }
}

export class FmpDividendDataProvider implements DividendDataProvider {
  readonly name = "fmp" as const;
  constructor(private apiKey: string) {}

  async fetchHistoricalDividends(
    ticker: string,
    from?: string,
    to?: string
  ): Promise<ProviderDividendEvent[]> {
    const symbol = ticker.toUpperCase();
    const params = new URLSearchParams({ symbol, apikey: this.apiKey });
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const url = `https://financialmodelingprep.com/stable/historical-price-full/stock_dividend?${params}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`FMP dividend fetch failed: ${res.status}`);

    const json = (await res.json()) as {
      historical?: {
        date: string;
        dividend: number;
        recordDate?: string;
        paymentDate?: string;
      }[];
    };

    return (json.historical ?? []).map((row) => ({
      ticker: symbol,
      exDividendDate: row.date,
      recordDate: row.recordDate ?? null,
      paymentDate: row.paymentDate ?? row.date,
      dividendPerShare: row.dividend,
      apiReferenceId: `fmp-${symbol}-${row.date}`,
    }));
  }

  async fetchDividendCalendar(
    from: string,
    to: string
  ): Promise<ProviderDividendEvent[]> {
    const params = new URLSearchParams({ from, to, apikey: this.apiKey });
    const url = `https://financialmodelingprep.com/stable/dividends-calendar?${params}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];

    const json = (await res.json()) as {
      symbol?: string;
      date?: string;
      dividend?: number;
      recordDate?: string;
      paymentDate?: string;
    }[];

    return (Array.isArray(json) ? json : []).map((row) => ({
      ticker: (row.symbol ?? "").toUpperCase(),
      exDividendDate: row.date ?? null,
      recordDate: row.recordDate ?? null,
      paymentDate: row.paymentDate ?? row.date ?? null,
      dividendPerShare: Number(row.dividend ?? 0),
      apiReferenceId: `fmp-cal-${row.symbol}-${row.date}`,
    }));
  }
}

export class AlphaVantageDividendDataProvider implements DividendDataProvider {
  readonly name = "alpha_vantage" as const;
  constructor(private apiKey: string) {}

  async fetchHistoricalDividends(
    ticker: string,
    _from?: string,
    _to?: string
  ): Promise<ProviderDividendEvent[]> {
    const params = new URLSearchParams({
      function: "DIVIDENDS",
      symbol: ticker.toUpperCase(),
      apikey: this.apiKey,
    });
    const url = `https://www.alphavantage.co/query?${params}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Alpha Vantage dividend fetch failed`);

    const json = (await res.json()) as {
      data?: {
        ex_dividend_date: string;
        record_date?: string;
        payment_date?: string;
        amount: string;
      }[];
    };

    return (json.data ?? []).map((row) => ({
      ticker: ticker.toUpperCase(),
      exDividendDate: row.ex_dividend_date,
      recordDate: row.record_date ?? null,
      paymentDate: row.payment_date ?? row.ex_dividend_date,
      dividendPerShare: parseFloat(row.amount),
      apiReferenceId: `av-${ticker}-${row.ex_dividend_date}`,
    }));
  }
}

export function getActiveDividendProvider(): DividendDataProvider {
  const fmpKey = process.env.FMP_API_KEY;
  if (fmpKey) return new FmpDividendDataProvider(fmpKey);

  const avKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (avKey) return new AlphaVantageDividendDataProvider(avKey);

  return new MockDividendDataProvider();
}

export async function fetchDividendsForTicker(
  ticker: string,
  from?: string,
  to?: string
): Promise<DividendProviderResult> {
  const primary = getActiveDividendProvider();
  try {
    const events = await primary.fetchHistoricalDividends(ticker, from, to);
    return { events, source: primary.name };
  } catch {
    const avKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (avKey && primary.name !== "alpha_vantage") {
      try {
        const fallback = new AlphaVantageDividendDataProvider(avKey);
        const events = await fallback.fetchHistoricalDividends(ticker, from, to);
        return { events, source: "alpha_vantage" };
      } catch {
        /* fall through */
      }
    }
    const mock = new MockDividendDataProvider();
    const events = await mock.fetchHistoricalDividends(ticker, from, to);
    return { events, source: "mock" };
  }
}
