import type { CurrencyCode } from "@/types/database";
import type { HoldingInput } from "./types";

const CRYPTO_TICKERS = new Set(["BTC", "ETH", "SOL", "CRYPTO"]);

export interface StocksOptionsRow {
  holding: HoldingInput;
  allocationPct: number;
}

export interface CurrencyGroup {
  currency: CurrencyCode;
  rows: StocksOptionsRow[];
  nativeSubtotal: number;
  sgdSubtotal: number;
}

export interface CryptoRow {
  label: string;
  holding: HoldingInput;
  currentValueSgd: number;
  costBasisSgd: number | null;
  gainLossSgd: number | null;
  allocationPct: number;
}

export interface CashRow {
  label: string;
  holding: HoldingInput;
  nativeValue: number;
  currency: CurrencyCode;
  sgdValue: number;
  allocationPct: number;
}

export interface PortfolioHoldingsPresentation {
  stocksAndOptions: {
    sgdGroup: CurrencyGroup;
    usdGroup: CurrencyGroup;
    totalSgd: number;
    allocationPct: number;
  };
  crypto: {
    rows: CryptoRow[];
    totalSgd: number;
    allocationPct: number;
  };
  cash: {
    sgdCash: CashRow | null;
    usdCash: CashRow | null;
    totalSgd: number;
    allocationPct: number;
  };
  summary: {
    stocksAndOptionsTotal: number;
    cryptoTotal: number;
    cashTotal: number;
    overallPortfolioValue: number;
  };
}

function isCash(h: HoldingInput): boolean {
  const t = h.ticker.toUpperCase();
  return t === "CASH" || t.startsWith("CASH.");
}

function isCrypto(h: HoldingInput): boolean {
  const t = h.ticker.toUpperCase();
  return (
    h.asset_type === "other" &&
    !isCash(h) &&
    (CRYPTO_TICKERS.has(t) || h.ticker.toLowerCase().includes("crypto"))
  );
}

function isStocksOrOptions(h: HoldingInput): boolean {
  return (
    h.asset_type === "stock" ||
    h.asset_type === "etf" ||
    h.asset_type === "option"
  );
}

function allocationPct(valueSgd: number, total: number): number {
  if (total <= 0) return 0;
  return (valueSgd / total) * 100;
}

function costBasisSgd(h: HoldingInput): number | null {
  if (h.cost_basis == null) return null;
  if (h.currency === "SGD") return h.cost_basis;
  return h.cost_basis * h.fx_rate_to_sgd;
}

function cryptoLabel(ticker: string): string {
  const t = ticker.toUpperCase();
  if (t === "BTC") return "BTC";
  if (t === "ETH") return "ETH";
  return "Other";
}

/** Presentation-only grouping — does not alter portfolio calculations. */
export function buildPortfolioHoldingsPresentation(
  holdings: HoldingInput[],
  overallPortfolioValue: number
): PortfolioHoldingsPresentation {
  const total = overallPortfolioValue > 0 ? overallPortfolioValue : 1;

  const stocksOptionsHoldings = holdings.filter(isStocksOrOptions);

  const sgdHoldings = stocksOptionsHoldings.filter((h) => h.currency === "SGD");
  const usdHoldings = stocksOptionsHoldings.filter((h) => h.currency === "USD");

  const mapStocksRows = (items: HoldingInput[]): StocksOptionsRow[] =>
    items.map((h) => ({
      holding: h,
      allocationPct: allocationPct(h.market_value_sgd, total),
    }));

  const sgdGroup: CurrencyGroup = {
    currency: "SGD",
    rows: mapStocksRows(sgdHoldings),
    nativeSubtotal: sgdHoldings.reduce((s, h) => s + h.market_value_native, 0),
    sgdSubtotal: sgdHoldings.reduce((s, h) => s + h.market_value_sgd, 0),
  };

  const usdGroup: CurrencyGroup = {
    currency: "USD",
    rows: mapStocksRows(usdHoldings),
    nativeSubtotal: usdHoldings.reduce((s, h) => s + h.market_value_native, 0),
    sgdSubtotal: usdHoldings.reduce((s, h) => s + h.market_value_sgd, 0),
  };

  const stocksAndOptionsTotal = sgdGroup.sgdSubtotal + usdGroup.sgdSubtotal;

  const cryptoHoldings = holdings.filter(isCrypto);
  const btc = cryptoHoldings.find((h) => h.ticker.toUpperCase() === "BTC");
  const eth = cryptoHoldings.find((h) => h.ticker.toUpperCase() === "ETH");
  const otherCrypto = cryptoHoldings.filter(
    (h) => !["BTC", "ETH"].includes(h.ticker.toUpperCase())
  );

  const cryptoRows: CryptoRow[] = [];

  for (const h of [btc, eth].filter(Boolean) as HoldingInput[]) {
    const cb = costBasisSgd(h);
    cryptoRows.push({
      label: cryptoLabel(h.ticker),
      holding: h,
      currentValueSgd: h.market_value_sgd,
      costBasisSgd: cb,
      gainLossSgd: cb != null ? h.market_value_sgd - cb : null,
      allocationPct: allocationPct(h.market_value_sgd, total),
    });
  }

  if (otherCrypto.length > 0) {
    const otherSgd = otherCrypto.reduce((s, h) => s + h.market_value_sgd, 0);
    const otherCost = otherCrypto.reduce((s, h) => {
      const cb = costBasisSgd(h);
      return cb != null ? s + cb : s;
    }, 0);
    const hasCost = otherCrypto.every((h) => h.cost_basis != null);
    cryptoRows.push({
      label: "Other",
      holding: otherCrypto[0],
      currentValueSgd: otherSgd,
      costBasisSgd: hasCost ? otherCost : null,
      gainLossSgd: hasCost ? otherSgd - otherCost : null,
      allocationPct: allocationPct(otherSgd, total),
    });
  }

  const cryptoTotal = cryptoHoldings.reduce((s, h) => s + h.market_value_sgd, 0);

  const sgdCashHolding = holdings.find(
    (h) => h.ticker.toUpperCase() === "CASH" && h.currency === "SGD"
  );
  const usdCashHolding = holdings.find((h) =>
    h.ticker.toUpperCase().startsWith("CASH.")
  );

  const sgdCash: CashRow | null = sgdCashHolding
    ? {
        label: "SGD Cash",
        holding: sgdCashHolding,
        nativeValue: sgdCashHolding.market_value_native,
        currency: "SGD",
        sgdValue: sgdCashHolding.market_value_sgd,
        allocationPct: allocationPct(sgdCashHolding.market_value_sgd, total),
      }
    : null;

  const usdCash: CashRow | null = usdCashHolding
    ? {
        label: "USD Cash",
        holding: usdCashHolding,
        nativeValue: usdCashHolding.market_value_native,
        currency: "USD",
        sgdValue: usdCashHolding.market_value_sgd,
        allocationPct: allocationPct(usdCashHolding.market_value_sgd, total),
      }
    : null;

  const cashTotal =
    (sgdCash?.sgdValue ?? 0) + (usdCash?.sgdValue ?? 0);

  return {
    stocksAndOptions: {
      sgdGroup,
      usdGroup,
      totalSgd: stocksAndOptionsTotal,
      allocationPct: allocationPct(stocksAndOptionsTotal, total),
    },
    crypto: {
      rows: cryptoRows,
      totalSgd: cryptoTotal,
      allocationPct: allocationPct(cryptoTotal, total),
    },
    cash: {
      sgdCash,
      usdCash,
      totalSgd: cashTotal,
      allocationPct: allocationPct(cashTotal, total),
    },
    summary: {
      stocksAndOptionsTotal,
      cryptoTotal,
      cashTotal,
      overallPortfolioValue,
    },
  };
}
