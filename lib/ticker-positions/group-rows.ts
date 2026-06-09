import type { SgMarketTickerRow, UsMarketTickerRow } from "./market-types";

export interface UsMarketRowGroups {
  etf: UsMarketTickerRow[];
  stock: UsMarketTickerRow[];
  options: UsMarketTickerRow[];
}

export function groupUsMarketRows(rows: UsMarketTickerRow[]): UsMarketRowGroups {
  return {
    etf: rows.filter((r) => r.marketCategory === "us_etf"),
    stock: rows.filter((r) => r.marketCategory === "us_stock"),
    options: rows.filter((r) => r.marketCategory === "us_options"),
  };
}

export function groupAllMarketRows(
  usRows: UsMarketTickerRow[],
  sgRows: SgMarketTickerRow[]
): UsMarketRowGroups & { sg: SgMarketTickerRow[] } {
  return {
    ...groupUsMarketRows(usRows),
    sg: sgRows,
  };
}
