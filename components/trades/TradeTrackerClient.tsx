"use client";

import { useState } from "react";
import { refreshUnderlyingPrices } from "@/app/actions/trades";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import type { EnrichedAlert } from "@/lib/alerts/types";
import type { ClientProfile } from "@/lib/client-profit-sharing/types";
import {
  DEFAULT_TRADE_SORT,
  readStoredTradeSort,
  writeStoredTradeSort,
  type TradeSortState,
} from "@/lib/trades/sort-trades";
import { CURRENT_OPTION_VALUE_NOT_UPDATED } from "@/lib/trades/format";
import type {
  EnrichedTrade,
  TradeTrackerData,
} from "@/lib/trades/types";
import { Plus } from "lucide-react";
import { EditCurrentValueModal } from "./EditCurrentValueModal";
import { TradeDetailDrawer } from "./TradeDetailDrawer";
import { TradeFormModal } from "./TradeFormModal";
import { TradeSummaryCards } from "./TradeSummaryCards";
import { TradeTrackerSections } from "./TradeTrackerSections";

interface TradeTrackerClientProps {
  initialData: TradeTrackerData;
  alerts?: EnrichedAlert[];
  clients?: ClientProfile[];
}

export function TradeTrackerClient({
  initialData,
  alerts = [],
  clients = [],
}: TradeTrackerClientProps) {
  const [data] = useState(initialData);
  const [selected, setSelected] = useState<EnrichedTrade | null>(null);
  const [formTrade, setFormTrade] = useState<EnrichedTrade | null | undefined>(
    undefined
  );
  const [valueTrade, setValueTrade] = useState<EnrichedTrade | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [sortState, setSortState] = useState<TradeSortState>(
    () => readStoredTradeSort() ?? DEFAULT_TRADE_SORT
  );

  const showRefreshPrice = data.dataSource === "supabase";

  function handleSortChange(next: TradeSortState) {
    setSortState(next);
    writeStoredTradeSort(next);
  }

  function handleRefresh() {
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Options Trade Tracker"
        description="Track bull put, bear call, and iron condor spreads — personal & shared P/L"
        actions={
          <>
            <Badge variant={data.dataSource === "supabase" ? "success" : "outline"}>
              {data.dataSource === "supabase" ? "Live data" : "Mock data"}
            </Badge>
            <Button variant="primary" size="sm" onClick={() => setFormTrade(null)}>
              <Plus className="h-4 w-4" />
              Create Trade
            </Button>
          </>
        }
      />

      <TradeSummaryCards summary={data.summary} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-terminal-muted">
          Shared trades split 55% personal / 45% client · Personal trades 100% yours
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "Show Open Only" : "Show All Trades"}
        </Button>
      </div>

      <TradeTrackerSections
        trades={data.trades}
        showAll={showAll}
        alerts={alerts}
        onSelect={setSelected}
        sortState={sortState}
        onSortChange={handleSortChange}
      />

      {selected && (
        <TradeDetailDrawer
          trade={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setFormTrade(selected);
            setSelected(null);
          }}
          onEditValue={() => {
            setValueTrade(selected);
          }}
          onRefresh={handleRefresh}
          showRefreshPrice={showRefreshPrice}
        />
      )}

      {formTrade !== undefined && (
        <TradeFormModal
          trade={formTrade}
          clients={clients}
          onClose={() => setFormTrade(undefined)}
          onSaved={handleRefresh}
        />
      )}

      {valueTrade && (
        <EditCurrentValueModal
          trade={valueTrade}
          onClose={() => setValueTrade(null)}
          onSaved={handleRefresh}
        />
      )}

      <p className="text-[11px] text-terminal-muted">
        Current Option Value is manual only · P/L = Premium Received − Current
        Option Value · Blank value shows {CURRENT_OPTION_VALUE_NOT_UPDATED}
      </p>
    </div>
  );
}
