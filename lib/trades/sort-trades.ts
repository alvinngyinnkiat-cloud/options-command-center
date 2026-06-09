import { resolveTradeDte } from "@/lib/trades/dte-display";
import type { EnrichedTrade } from "@/lib/trades/types";

export type TradeSortColumn =
  | "dte"
  | "underlying"
  | "strategy"
  | "pnlPct"
  | "breakevenPct"
  | "status";

export type TradeSortDirection = "asc" | "desc";

export interface TradeSortState {
  column: TradeSortColumn;
  direction: TradeSortDirection;
}

export const DEFAULT_TRADE_SORT: TradeSortState = {
  column: "dte",
  direction: "asc",
};

export const TRADE_SORT_STORAGE_KEY = "occ-options-trade-sort";

const VALID_COLUMNS: TradeSortColumn[] = [
  "dte",
  "underlying",
  "strategy",
  "pnlPct",
  "breakevenPct",
  "status",
];

const STATUS_ORDER: Record<string, number> = {
  open: 0,
  managed: 1,
  closing: 2,
  rolled: 3,
  closed: 4,
};

export function isClosedTrade(trade: EnrichedTrade): boolean {
  return trade.status === "closed";
}

export function getTradeClosedTimestamp(trade: EnrichedTrade): number {
  if (!trade.updatedAt) return 0;
  const ts = Date.parse(trade.updatedAt);
  return Number.isFinite(ts) ? ts : 0;
}

function defaultDirectionForColumn(column: TradeSortColumn): TradeSortDirection {
  switch (column) {
    case "pnlPct":
    case "breakevenPct":
      return "desc";
    default:
      return "asc";
  }
}

export function toggleTradeSort(
  current: TradeSortState,
  column: TradeSortColumn
): TradeSortState {
  if (current.column === column) {
    return {
      column,
      direction: current.direction === "asc" ? "desc" : "asc",
    };
  }
  return { column, direction: defaultDirectionForColumn(column) };
}

export function readStoredTradeSort(): TradeSortState {
  if (typeof window === "undefined") return DEFAULT_TRADE_SORT;
  try {
    const raw = localStorage.getItem(TRADE_SORT_STORAGE_KEY);
    if (!raw) return DEFAULT_TRADE_SORT;
    const parsed = JSON.parse(raw) as Partial<TradeSortState>;
    if (
      parsed.column &&
      VALID_COLUMNS.includes(parsed.column) &&
      (parsed.direction === "asc" || parsed.direction === "desc")
    ) {
      return { column: parsed.column, direction: parsed.direction };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_TRADE_SORT;
}

export function writeStoredTradeSort(sort: TradeSortState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRADE_SORT_STORAGE_KEY, JSON.stringify(sort));
}

function compareTicker(a: EnrichedTrade, b: EnrichedTrade): number {
  return a.ticker.localeCompare(b.ticker);
}

function compareDteValues(
  da: number | null,
  db: number | null,
  direction: TradeSortDirection
): number {
  if (da == null && db == null) return 0;
  if (da == null) return 1;
  if (db == null) return -1;
  const diff = da - db;
  return direction === "asc" ? diff : -diff;
}

function compareClosedDateDesc(a: EnrichedTrade, b: EnrichedTrade): number {
  const diff = getTradeClosedTimestamp(b) - getTradeClosedTimestamp(a);
  return diff || compareTicker(a, b);
}

function compareByColumn(
  a: EnrichedTrade,
  b: EnrichedTrade,
  sort: TradeSortState
): number {
  switch (sort.column) {
    case "dte":
      return (
        compareDteValues(
          resolveTradeDte(a.expirationDate),
          resolveTradeDte(b.expirationDate),
          sort.direction
        ) || compareTicker(a, b)
      );
    case "underlying":
      return sort.direction === "asc"
        ? compareTicker(a, b)
        : compareTicker(b, a);
    case "strategy":
      return sort.direction === "asc"
        ? a.strategyLabel.localeCompare(b.strategyLabel) || compareTicker(a, b)
        : b.strategyLabel.localeCompare(a.strategyLabel) || compareTicker(a, b);
    case "pnlPct": {
      const diff = a.calculations.currentPnlPct - b.calculations.currentPnlPct;
      return sort.direction === "asc" ? diff || compareTicker(a, b) : -diff || compareTicker(a, b);
    }
    case "breakevenPct": {
      const av = a.underlyingPriceUsable
        ? a.calculations.breakevenSafetyDistancePct
        : null;
      const bv = b.underlyingPriceUsable
        ? b.calculations.breakevenSafetyDistancePct
        : null;
      if (av == null && bv == null) return compareTicker(a, b);
      if (av == null) return 1;
      if (bv == null) return -1;
      const diff = av - bv;
      return sort.direction === "asc" ? diff || compareTicker(a, b) : -diff || compareTicker(a, b);
    }
    case "status": {
      const ao = STATUS_ORDER[a.status] ?? 99;
      const bo = STATUS_ORDER[b.status] ?? 99;
      const diff = ao - bo;
      return sort.direction === "asc" ? diff || compareTicker(a, b) : -diff || compareTicker(a, b);
    }
    default:
      return compareTicker(a, b);
  }
}

/** Default composite when showing all trades: open by DTE asc, closed by closed date desc. */
function compareDefaultShowAll(a: EnrichedTrade, b: EnrichedTrade): number {
  const aClosed = isClosedTrade(a);
  const bClosed = isClosedTrade(b);
  if (aClosed !== bClosed) return aClosed ? 1 : -1;
  if (aClosed && bClosed) return compareClosedDateDesc(a, b);
  return (
    compareDteValues(
      resolveTradeDte(a.expirationDate),
      resolveTradeDte(b.expirationDate),
      "asc"
    ) || compareTicker(a, b)
  );
}

export function sortTrades(
  trades: EnrichedTrade[],
  sort: TradeSortState,
  showAll: boolean
): EnrichedTrade[] {
  const useDefaultComposite =
    showAll && sort.column === "dte" && sort.direction === "asc";

  return [...trades].sort((a, b) => {
    if (useDefaultComposite) return compareDefaultShowAll(a, b);
    return compareByColumn(a, b, sort);
  });
}
