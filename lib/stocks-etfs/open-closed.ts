import type { SgStockRow } from "./types";
import type { UsEquityPositionRow } from "./us-equity-positions";

export function splitUsEquityRows(rows: UsEquityPositionRow[]): {
  open: UsEquityPositionRow[];
  closed: UsEquityPositionRow[];
} {
  const open = rows.filter((r) => r.shares > 0);
  const closed = rows.filter((r) => r.shares === 0);
  return { open, closed };
}

export function splitSgStockRows(rows: SgStockRow[]): {
  open: SgStockRow[];
  closed: SgStockRow[];
} {
  const open = rows.filter((r) => r.shares > 0);
  const closed = rows.filter((r) => r.shares === 0);
  return { open, closed };
}
