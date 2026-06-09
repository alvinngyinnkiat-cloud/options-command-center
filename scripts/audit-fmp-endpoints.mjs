import { readFileSync } from "fs";
import { format, subDays } from "date-fns";

const ENDPOINT =
  "https://financialmodelingprep.com/stable/historical-price-eod/full";
const SYMBOLS = ["QQQ", "GLD", "XSP", "IWM", "NVDA"];

function loadKey() {
  const raw = readFileSync(".env.local", "utf8");
  const line = raw.split(/\r?\n/).find((l) => /^FMP_API_KEY=/.test(l));
  return line ? line.slice("FMP_API_KEY=".length).trim() : "";
}

function lastCompletedDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function classify(raw, contentType, status) {
  const t = raw.trim();
  if (status === 429 || /rate limit/i.test(t)) return "rate_limit";
  if (contentType?.includes("html") || t.startsWith("<!DOCTYPE"))
    return "html_error";
  if (/^premium/i.test(t) || /premium endpoint|premium query/i.test(t))
    return "premium_restriction";
  if (t.startsWith("[")) return "json_array";
  if (t.startsWith("{")) return "json_object";
  if (!t) return "empty";
  return "plain_text";
}

async function auditSymbol(symbol, apiKey) {
  const to = lastCompletedDate();
  const from = format(subDays(new Date(`${to}T12:00:00Z`), 30), "yyyy-MM-dd");
  const params = new URLSearchParams({
    symbol,
    from,
    to,
    apikey: apiKey,
  });
  const url = `${ENDPOINT}?${params}`;
  const res = await fetch(url, { cache: "no-store" });
  const raw = await res.text();
  const contentType = res.headers.get("content-type");
  let parseError = null;
  let candleCount = null;
  try {
    const parsed = JSON.parse(raw);
    candleCount = Array.isArray(parsed)
      ? parsed.length
      : Array.isArray(parsed?.historical)
        ? parsed.historical.length
        : null;
  } catch (e) {
    parseError = e instanceof Error ? e.message : "parse failed";
  }
  return {
    symbol,
    url: url.replace(/apikey=[^&]+/, "apikey=REDACTED"),
    httpStatus: res.status,
    contentType,
    kind: classify(raw, contentType, res.status),
    parseError,
    candleCount,
    preview: raw.replace(/\s+/g, " ").slice(0, 200),
  };
}

const apiKey = loadKey();
if (!apiKey) {
  console.error("FMP_API_KEY missing");
  process.exit(1);
}

for (const symbol of SYMBOLS) {
  const r = await auditSymbol(symbol, apiKey);
  console.log("---", r.symbol);
  console.log("URL:", r.url);
  console.log("HTTP:", r.httpStatus);
  console.log("Content-Type:", r.contentType);
  console.log("Kind:", r.kind);
  console.log("ParseError:", r.parseError);
  console.log("Candles:", r.candleCount);
  console.log("Preview:", r.preview);
}
