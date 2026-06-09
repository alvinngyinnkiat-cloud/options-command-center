import { readFileSync } from "fs";

const key = readFileSync(".env.local", "utf8")
  .split(/\r?\n/)
  .find((l) => /^FMP_API_KEY=/.test(l))
  ?.slice("FMP_API_KEY=".length)
  .trim();

const from = "2026-05-10";
const to = "2026-06-09";

const tests = [
  [
    "v3-historical-price-full",
    `https://financialmodelingprep.com/api/v3/historical-price-full/QQQ?from=${from}&to=${to}&apikey=${key}`,
  ],
  [
    "v3-historical-line",
    `https://financialmodelingprep.com/api/v3/historical-price-full/QQQ?serietype=line&from=${from}&to=${to}&apikey=${key}`,
  ],
  [
    "stable-historical-price-eod",
    `https://financialmodelingprep.com/stable/historical-price-eod?symbol=QQQ&from=${from}&to=${to}&apikey=${key}`,
  ],
  [
    "stable-quote",
    `https://financialmodelingprep.com/stable/quote?symbol=QQQ&apikey=${key}`,
  ],
];

for (const [name, url] of tests) {
  const res = await fetch(url);
  const text = await res.text();
  console.log("---", name);
  console.log("HTTP:", res.status);
  console.log("Preview:", text.replace(/\s+/g, " ").slice(0, 180));
}
