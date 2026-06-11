import { calculateRoiPct } from "@/lib/ticker-positions/income-yield";
import type { EnrichedStockEtfHolding } from "./types";
import type { SgStockRow } from "./types";
import type { UsEquityPositionRow } from "./us-equity-positions";

export interface StockEtfHoldingsTableRow {
  id: string;
  ticker: string;
  holding: EnrichedStockEtfHolding;
  shares: number;
  capital: number;
  currentValue: number;
  /** Lifetime dividends received for the ticker. */
  dividend: number;
  /** Unrealized capital gain/loss: current value − capital. */
  pl: number;
  roiPct: number;
  currency: "USD" | "SGD";
}

export function buildStockEtfTableMetrics(
  capital: number,
  currentValue: number,
  dividend: number
): Pick<StockEtfHoldingsTableRow, "pl" | "roiPct"> {
  const pl = currentValue - capital;
  return {
    pl,
    roiPct: calculateRoiPct(pl, capital),
  };
}

export function usEquityRowToTableRow(
  row: UsEquityPositionRow
): StockEtfHoldingsTableRow | null {
  if (!row.holding) return null;

  const capital = row.holding.totalInvestedNative;
  const currentValue = row.marketValue;
  const dividend = row.dividendIncome;
  const { pl, roiPct } = buildStockEtfTableMetrics(
    capital,
    currentValue,
    dividend
  );

  return {
    id: row.holding.id,
    ticker: row.ticker,
    holding: row.holding,
    shares: row.shares,
    capital,
    currentValue,
    dividend,
    pl,
    roiPct,
    currency: "USD",
  };
}

export function sgStockRowToTableRow(row: SgStockRow): StockEtfHoldingsTableRow {
  const capital = row.holding.totalInvestedNative;
  const currentValue = row.marketValue;
  const dividend = row.dividendIncome;
  const { pl, roiPct } = buildStockEtfTableMetrics(
    capital,
    currentValue,
    dividend
  );

  return {
    id: row.holding.id,
    ticker: row.holding.ticker,
    holding: row.holding,
    shares: row.shares,
    capital,
    currentValue,
    dividend,
    pl,
    roiPct,
    currency: "SGD",
  };
}

export function mapUsEquityRowsToTable(
  rows: UsEquityPositionRow[]
): StockEtfHoldingsTableRow[] {
  return rows
    .map(usEquityRowToTableRow)
    .filter((row): row is StockEtfHoldingsTableRow => row != null);
}

export function mapSgStockRowsToTable(rows: SgStockRow[]): StockEtfHoldingsTableRow[] {
  return rows.map(sgStockRowToTableRow);
}
