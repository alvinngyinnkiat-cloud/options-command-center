"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import type { EnrichedAlert } from "@/lib/alerts/types";
import type { ClientProfile } from "@/lib/client-profit-sharing/types";
import type {
  EnrichedTrade,
  TradeTrackerData,
  TradeTrackerViewMode,
} from "@/lib/trades/types";
import { LayoutGrid, List, Plus, Table2 } from "lucide-react";
import { EditCurrentValueModal } from "./EditCurrentValueModal";
import { OpenTradesTable } from "./OpenTradesTable";
import { TradeDetailDrawer } from "./TradeDetailDrawer";
import { TradeFormModal } from "./TradeFormModal";
import { TradeSummaryCards } from "./TradeSummaryCards";

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
  const [viewMode, setViewMode] = useState<TradeTrackerViewMode>("summary");

  function handleRefresh() {
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Options Trade Tracker"
        description="Track bull put, bear call, and iron condor spreads — Phase 8"
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

      <div>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
            {showAll ? "All Trades" : "Open Trades"}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 rounded-md border border-terminal-border p-1">
              <Button
                variant={viewMode === "summary" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("summary")}
              >
                <List className="h-4 w-4" />
                Summary View
              </Button>
              <Button
                variant={viewMode === "card" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("card")}
              >
                <LayoutGrid className="h-4 w-4" />
                Card View
              </Button>
              <Button
                variant={viewMode === "detailed" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("detailed")}
              >
                <Table2 className="h-4 w-4" />
                Detailed View
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Show Open Only" : "Show All Trades"}
            </Button>
          </div>
        </div>
        <OpenTradesTable
          trades={data.trades}
          viewMode={viewMode}
          showAll={showAll}
          onSelect={setSelected}
          onEdit={setFormTrade}
          onEditValue={setValueTrade}
          alerts={alerts}
        />
      </div>

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
        P/L uses Current Option Value (manual → broker → system) · S/R manual
        only · Journal at /journal
      </p>
    </div>
  );
}
