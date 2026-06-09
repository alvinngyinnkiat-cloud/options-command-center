import { format, subDays } from "date-fns";
import { lastCompletedTradingDate } from "@/lib/market-calendar/nyse-calendar";
import { FMP_EOD_ENDPOINT } from "@/lib/watchlist/market-data-provider";

export const FMP_AUDIT_SYMBOLS = ["QQQ", "GLD", "XSP", "IWM", "NVDA"] as const;

export type FmpResponseKind =
  | "json_array"
  | "json_object"
  | "premium_restriction"
  | "subscription_message"
  | "error_message_json"
  | "html_error"
  | "rate_limit"
  | "empty"
  | "plain_text"
  | "unknown";

export interface FmpEndpointAuditRow {
  symbol: string;
  endpoint: string;
  urlWithoutApiKey: string;
  httpStatus: number;
  contentType: string | null;
  rawPreview: string;
  responseKind: FmpResponseKind;
  parseError: string | null;
  candleCount: number | null;
  classification: string;
}

function redactApiKey(url: string): string {
  return url.replace(/apikey=[^&]+/i, "apikey=REDACTED");
}

function classifyRawBody(
  raw: string,
  contentType: string | null,
  httpStatus: number
): { kind: FmpResponseKind; classification: string } {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  if (httpStatus === 402 || /^premium query parameter/i.test(trimmed)) {
    return {
      kind: "premium_restriction",
      classification:
        "HTTP 402 — symbol or endpoint not included in current FMP subscription",
    };
  }

  if (httpStatus === 429 || /rate limit|too many requests/i.test(trimmed)) {
    return { kind: "rate_limit", classification: "Rate limit response" };
  }

  if (contentType?.includes("text/html") || trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    return { kind: "html_error", classification: "HTML error page" };
  }

  if (/^premium/i.test(trimmed) || /premium endpoint|premium query|premium subscription/i.test(trimmed)) {
    return {
      kind: "premium_restriction",
      classification: "Premium endpoint / subscription restriction (plain text)",
    };
  }

  if (/subscription|upgrade your plan|not available on your current plan/i.test(trimmed)) {
    return {
      kind: "subscription_message",
      classification: "Subscription plan restriction message",
    };
  }

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return { kind: trimmed.startsWith("[") ? "json_array" : "json_object", classification: "JSON body" };
  }

  if (trimmed.length === 0) {
    return { kind: "empty", classification: "Empty response body" };
  }

  if (/^[A-Za-z]/.test(trimmed) && !trimmed.startsWith("{")) {
    return { kind: "plain_text", classification: "Plain text (non-JSON)" };
  }

  return { kind: "unknown", classification: "Unknown response format" };
}

function countCandles(parsed: unknown): number | null {
  if (Array.isArray(parsed)) return parsed.length;
  if (parsed && typeof parsed === "object" && "historical" in parsed) {
    const hist = (parsed as { historical?: unknown[] }).historical;
    return Array.isArray(hist) ? hist.length : null;
  }
  return null;
}

export function buildFmpAuditUrl(
  symbol: string,
  apiKey: string,
  now: Date = new Date()
): { url: string; from: string; to: string } {
  const to = lastCompletedTradingDate(now);
  const from = format(subDays(new Date(`${to}T12:00:00Z`), 30), "yyyy-MM-dd");
  const params = new URLSearchParams({
    symbol: symbol.toUpperCase(),
    from,
    to,
    apikey: apiKey,
  });
  return {
    url: `${FMP_EOD_ENDPOINT}?${params}`,
    from,
    to,
  };
}

/** Audit-only fetch — reads raw text before JSON.parse. Does not modify production provider. */
export async function auditFmpSymbolRequest(
  symbol: string,
  apiKey: string,
  now: Date = new Date()
): Promise<FmpEndpointAuditRow> {
  const { url, from, to } = buildFmpAuditUrl(symbol, apiKey, now);
  const endpoint = FMP_EOD_ENDPOINT;

  let httpStatus = 0;
  let contentType: string | null = null;
  let raw = "";

  try {
    const res = await fetch(url, { cache: "no-store" });
    httpStatus = res.status;
    contentType = res.headers.get("content-type");
    raw = await res.text();
  } catch (e) {
    raw = e instanceof Error ? e.message : "Fetch failed";
    return {
      symbol: symbol.toUpperCase(),
      endpoint,
      urlWithoutApiKey: redactApiKey(url),
      httpStatus,
      contentType,
      rawPreview: raw.slice(0, 200),
      responseKind: "unknown",
      parseError: raw,
      candleCount: null,
      classification: "Network or fetch error",
    };
  }

  const { kind, classification } = classifyRawBody(raw, contentType, httpStatus);
  let parseError: string | null = null;
  let candleCount: number | null = null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    candleCount = countCandles(parsed);
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      "Error Message" in parsed
    ) {
      parseError = String((parsed as { "Error Message": string })["Error Message"]);
    }
  } catch (e) {
    parseError = e instanceof Error ? e.message : "JSON parse failed";
  }

  let finalClassification = classification;
  if (parseError?.includes("Premium") || kind === "premium_restriction") {
    finalClassification = "Premium endpoint message (non-JSON)";
  } else if (parseError && kind !== "json_array" && kind !== "json_object") {
    finalClassification = `JSON parse failed — likely ${classification}`;
  } else if (candleCount != null && candleCount > 0) {
    finalClassification = `Valid JSON — ${candleCount} candles (${from} to ${to})`;
  }

  return {
    symbol: symbol.toUpperCase(),
    endpoint,
    urlWithoutApiKey: redactApiKey(url),
    httpStatus,
    contentType,
    rawPreview: raw.slice(0, 200),
    responseKind: kind,
    parseError,
    candleCount,
    classification: finalClassification,
  };
}

export async function runFmpEndpointAudit(
  symbols: readonly string[] = FMP_AUDIT_SYMBOLS
): Promise<FmpEndpointAuditRow[]> {
  const key = process.env.FMP_API_KEY?.trim();
  if (!key) {
    return symbols.map((symbol) => ({
      symbol: symbol.toUpperCase(),
      endpoint: FMP_EOD_ENDPOINT,
      urlWithoutApiKey: `${FMP_EOD_ENDPOINT}?symbol=${symbol}&from=…&to=…&apikey=REDACTED`,
      httpStatus: 0,
      contentType: null,
      rawPreview: "",
      responseKind: "unknown" as const,
      parseError: "FMP_API_KEY is not configured",
      candleCount: null,
      classification: "Missing API key",
    }));
  }

  return Promise.all(symbols.map((symbol) => auditFmpSymbolRequest(symbol, key)));
}
