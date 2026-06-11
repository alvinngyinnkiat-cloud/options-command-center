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
  fees: number;
  /** Unrealized capital gain/loss: current value − capital (manual) or same (transaction). */
  pl: number;
  roiPct: number;
  /** P/L including dividend and fees (manual mode formula). */
  plWithDividend: number;
  currency: "USD" | "SGD";
}

function resolveDividendIncome(
  holding: EnrichedStockEtfHolding,
  externalDividend: number
): number {
  if (holding.manualTotalDividend > 0) {
    return holding.manualTotalDividend;
  }
  return externalDividend;
}

export function buildStockEtfTableMetrics(
  holding: EnrichedStockEtfHolding,
  capital: number,
  currentValue: number,
  externalDividend: number
): Pick<StockEtfHoldingsTableRow, "dividend" | "fees" | "pl" | "roiPct" | "plWithDividend"> {
  const dividend = resolveDividendIncome(holding, externalDividend);
  const fees = holding.manualTotalFees;
  const pl = currentValue - capital;
  const roiPct = calculateRoiPct(pl, capital);

  return {
    dividend,
    fees,
    pl,
    roiPct,
    plWithDividend: pl + dividend - fees,
  };
}

export function usEquityRowToTableRow(
  row: UsEquityPositionRow
): StockEtfHoldingsTableRow | null {
  if (!row.holding) return null;

  const capital = row.holding.totalInvestedNative;
  const currentValue = row.marketValue;
  const { dividend, fees, pl, roiPct, plWithDividend } = buildStockEtfTableMetrics(
    row.holding,
    capital,
    currentValue,
    row.dividendIncome
  );

  return {
    id: row.holding.id,
    ticker: row.ticker,
    holding: row.holding,
    shares: row.shares,
    capital,
    currentValue,
    dividend,
    fees,
    pl,
    roiPct,
    plWithDividend,
    currency: "USD",
  };
}

export function sgStockRowToTableRow(row: SgStockRow): StockEtfHoldingsTableRow {
  const capital = row.holding.totalInvestedNative;
  const currentValue = row.marketValue;
  const { dividend, fees, pl, roiPct, plWithDividend } = buildStockEtfTableMetrics(
    row.holding,
    capital,
    currentValue,
    row.dividendIncome
  );

  return {
    id: row.holding.id,
    ticker: row.holding.ticker,
    holding: row.holding,
    shares: row.shares,
    capital,
    currentValue,
    dividend,
    fees,
    pl,
    roiPct,
    plWithDividend,
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
