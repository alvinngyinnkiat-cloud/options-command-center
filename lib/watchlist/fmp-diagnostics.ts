import { calculateAveragePrice } from "@/lib/watchlist/average-price";
import {
  FMP_EOD_ENDPOINT,
  fetchDailyCandlesForTicker,
  getActiveMarketDataProvider,
} from "@/lib/watchlist/market-data-provider";
import {
  lastCompletedTradingDate,
  selectCompletedCandleDate,
} from "@/lib/market-calendar/nyse-calendar";
import { subDays, format } from "date-fns";

export type FmpConnectionStatus =
  | "connected"
  | "missing_api_key"
  | "invalid_key"
  | "rate_limited"
  | "no_data_returned"
  | "symbol_unsupported";

export interface FmpSymbolCandleResult {
  symbol: string;
  candleDate: string | null;
  high: number | null;
  low: number | null;
  averagePrice: number | null;
  source: "FMP" | "Yahoo";
  error: string | null;
  status: FmpConnectionStatus;
}

export interface FmpDiagnosticsResult {
  status: FmpConnectionStatus;
  statusLabel: string;
  apiKeyConfigured: boolean;
  apiReachable: boolean;
  remainingQuota: string | null;
  endpoint: string;
  completedCandleTarget: string;
  probeError: string | null;
  symbols: FmpSymbolCandleResult[];
}

export const FMP_TEST_SYMBOLS = [
  "QQQ",
  "GLD",
  "XSP",
  "IWM",
  "NVDA",
] as const;

const STATUS_LABELS: Record<FmpConnectionStatus, string> = {
  connected: "Connected",
  missing_api_key: "Missing API Key",
  invalid_key: "Invalid Key",
  rate_limited: "Rate Limited",
  no_data_returned: "No Data Returned",
  symbol_unsupported: "Symbol Unsupported",
};

function parseFmpErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (typeof record["Error Message"] === "string") return record["Error Message"];
  if (typeof record.error === "string") return record.error;
  if (typeof record.message === "string") return record.message;
  return null;
}

function classifyHttpError(status: number, message: string | null): FmpConnectionStatus {
  if (status === 429) return "rate_limited";
  if (status === 401 || status === 403) return "invalid_key";
  if (/limit|quota|rate/i.test(message ?? "")) return "rate_limited";
  if (/invalid|unauthorized|api key|access denied/i.test(message ?? "")) {
    return "invalid_key";
  }
  return "no_data_returned";
}

export async function probeFmpApiKey(): Promise<{
  status: FmpConnectionStatus;
  apiReachable: boolean;
  remainingQuota: string | null;
  probeError: string | null;
}> {
  const key = process.env.FMP_API_KEY?.trim();
  if (!key) {
    return {
      status: "missing_api_key",
      apiReachable: false,
      remainingQuota: null,
      probeError: "FMP_API_KEY is not set",
    };
  }

  const completed = lastCompletedTradingDate();
  const from = format(subDays(new Date(`${completed}T12:00:00Z`), 14), "yyyy-MM-dd");
  const params = new URLSearchParams({
    symbol: "QQQ",
    from,
    to: completed,
    apikey: key,
  });

  try {
    const res = await fetch(`${FMP_EOD_ENDPOINT}?${params}`, { cache: "no-store" });
    const json = (await res.json()) as unknown;
    const message = parseFmpErrorMessage(json);

    const remainingQuota =
      res.headers.get("x-ratelimit-remaining") ??
      res.headers.get("X-RateLimit-Remaining") ??
      null;

    if (!res.ok) {
      return {
        status: classifyHttpError(res.status, message),
        apiReachable: true,
        remainingQuota,
        probeError: message ?? `HTTP ${res.status}`,
      };
    }

    const rows = Array.isArray(json)
      ? json
      : ((json as { historical?: unknown[] }).historical ?? []);

    if (rows.length === 0) {
      return {
        status: message ? classifyHttpError(res.status, message) : "no_data_returned",
        apiReachable: true,
        remainingQuota,
        probeError: message ?? "Empty response for QQQ probe",
      };
    }

    return {
      status: "connected",
      apiReachable: true,
      remainingQuota,
      probeError: null,
    };
  } catch (e) {
    return {
      status: "no_data_returned",
      apiReachable: false,
      remainingQuota: null,
      probeError: e instanceof Error ? e.message : "FMP probe failed",
    };
  }
}

export async function fetchFmpCompletedCandle(
  symbol: string,
  now: Date = new Date()
): Promise<FmpSymbolCandleResult> {
  const normalized = symbol.toUpperCase();
  const completedCandleTarget = lastCompletedTradingDate(now);
  const base: FmpSymbolCandleResult = {
    symbol: normalized,
    candleDate: null,
    high: null,
    low: null,
    averagePrice: null,
    source: "FMP",
    error: null,
    status: "missing_api_key",
  };

  if (!getActiveMarketDataProvider()) {
    return {
      ...base,
      status: "missing_api_key",
      error: "FMP_API_KEY is not configured",
    };
  }

  const from = format(
    subDays(new Date(`${completedCandleTarget}T12:00:00Z`), 30),
    "yyyy-MM-dd"
  );

  try {
    const { candles, source } = await fetchDailyCandlesForTicker(
      normalized,
      from,
      completedCandleTarget
    );
    const dates = candles.map((c) => c.date);
    const targetDate = selectCompletedCandleDate(dates, now);
    const candle =
      candles.find((c) => c.date === targetDate) ??
      candles.filter((c) => c.date <= completedCandleTarget).at(-1);

    if (!candle) {
      return {
        ...base,
        status: "symbol_unsupported",
        error: `No completed candle through ${completedCandleTarget}`,
      };
    }

    return {
      symbol: normalized,
      candleDate: candle.date,
      high: candle.high,
      low: candle.low,
      averagePrice: calculateAveragePrice(candle.high, candle.low),
      source: source === "fmp" ? "FMP" : "Yahoo",
      error: null,
      status: "connected",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Fetch failed";
    let status: FmpConnectionStatus = "no_data_returned";
    if (/401|403|invalid|unauthorized|api key/i.test(message)) {
      status = "invalid_key";
    } else if (/429|rate|limit|quota/i.test(message)) {
      status = "rate_limited";
    } else if (/unsupported|no completed|empty/i.test(message)) {
      status = "symbol_unsupported";
    }

    return {
      ...base,
      status,
      error: message,
    };
  }
}

export async function runFmpDiagnostics(
  symbols: readonly string[] = FMP_TEST_SYMBOLS,
  now: Date = new Date()
): Promise<FmpDiagnosticsResult> {
  const completedCandleTarget = lastCompletedTradingDate(now);
  const probe = await probeFmpApiKey();

  const symbolResults = await Promise.all(
    symbols.map((symbol) => fetchFmpCompletedCandle(symbol, now))
  );

  let status = probe.status;
  if (status === "connected") {
    const symbolStatuses = symbolResults.map((r) => r.status);
    if (symbolStatuses.every((s) => s === "symbol_unsupported")) {
      status = "symbol_unsupported";
    } else if (symbolStatuses.some((s) => s === "rate_limited")) {
      status = "rate_limited";
    } else if (symbolStatuses.some((s) => s === "invalid_key")) {
      status = "invalid_key";
    } else if (
      symbolResults.every((r) => r.candleDate == null && r.error != null)
    ) {
      status = "no_data_returned";
    }
  }

  return {
    status,
    statusLabel: STATUS_LABELS[status],
    apiKeyConfigured: !!process.env.FMP_API_KEY?.trim(),
    apiReachable: probe.apiReachable,
    remainingQuota: probe.remainingQuota,
    endpoint: FMP_EOD_ENDPOINT,
    completedCandleTarget,
    probeError: probe.probeError,
    symbols: symbolResults,
  };
}

export function fmpStatusToHealthBadge(
  status: FmpConnectionStatus
): "healthy" | "warning" | "failed" {
  if (status === "connected") return "healthy";
  if (status === "missing_api_key" || status === "rate_limited") return "warning";
  return "failed";
}

export { STATUS_LABELS as FMP_STATUS_LABELS };
