"use client";

import { splitUsEquityRows } from "@/lib/stocks-etfs/open-closed";
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
  const { open, closed } = splitUsEquityRows(rows);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-terminal-muted">
          Open Positions
        </h3>
        <StockEtfHoldingsTable
          rows={mapUsEquityRowsToTable(open)}
          emptyLabel={`open ${label}`}
          onRefresh={onRefresh}
        />
      </section>

      <section>
        <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-terminal-muted">
          Closed Positions
        </h3>
        <StockEtfHoldingsTable
          rows={mapUsEquityRowsToTable(closed)}
          emptyLabel={`closed ${label}`}
          onRefresh={onRefresh}
        />
      </section>
    </div>
  );
}
