"use client";

import { mapUsEquityRowsToTable } from "@/lib/stocks-etfs/table-rows";
import type { UsEquityPositionRow } from "@/lib/stocks-etfs/types";
import { StockEtfHoldingsTable } from "./StockEtfHoldingsTable";

interface UsEquityHoldingsViewsProps {
  rows: UsEquityPositionRow[];
  label: string;
  onRefresh: () => void;
}

export function UsEquityHoldingsViews({
  rows,
  label,
  onRefresh,
}: UsEquityHoldingsViewsProps) {
  return (
    <StockEtfHoldingsTable
      rows={mapUsEquityRowsToTable(rows)}
      emptyLabel={label}
      onRefresh={onRefresh}
    />
  );
}
