"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import type {
  EnrichedJournalEntry,
  JournalTrackerData,
} from "@/lib/journal/types";
import type { EnrichedTrade } from "@/lib/trades/types";
import { Plus } from "lucide-react";
import { JournalFormModal } from "./JournalFormModal";
import { JournalReviewDrawer } from "./JournalReviewDrawer";
import { JournalSummaryCards } from "./JournalSummaryCards";
import { JournalTable } from "./JournalTable";

interface JournalClientProps {
  initialData: JournalTrackerData;
  trades: EnrichedTrade[];
  initialTradeForForm?: EnrichedTrade | null;
}

export function JournalClient({
  initialData,
  trades,
  initialTradeForForm,
}: JournalClientProps) {
  const [data, setData] = useState(initialData);
  const [selected, setSelected] = useState<EnrichedJournalEntry | null>(null);
  const [formEntry, setFormEntry] = useState<
    EnrichedJournalEntry | null | undefined
  >(initialTradeForForm ? null : undefined);
  const [prefillTrade, setPrefillTrade] = useState<EnrichedTrade | null>(
    initialTradeForForm ?? null
  );

  function handleRefresh(next?: JournalTrackerData) {
    if (next) {
      setData(next);
      return;
    }
    window.location.reload();
  }

  function openCreate() {
    setFormEntry(null);
    setPrefillTrade(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trading Journal"
        description="Record trade reasoning, entry/exit data, lessons learned, and review notes — Phase 9"
        actions={
          <>
            <Badge
              variant={data.dataSource === "supabase" ? "success" : "outline"}
            >
              {data.dataSource === "supabase" ? "Live data" : "Mock data"}
            </Badge>
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Create Entry
            </Button>
          </>
        }
      />

      <JournalSummaryCards summary={data.summary} />

      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Journal Entries
        </h2>
        <JournalTable
          entries={data.entries}
          onSelect={setSelected}
        />
      </div>

      {selected && (
        <JournalReviewDrawer
          entry={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setFormEntry(selected);
            setPrefillTrade(null);
            setSelected(null);
          }}
          onRefresh={handleRefresh}
        />
      )}

      {formEntry !== undefined && (
        <JournalFormModal
          entry={formEntry}
          trades={trades}
          prefillTrade={prefillTrade}
          onClose={() => {
            setFormEntry(undefined);
            setPrefillTrade(null);
          }}
          onSaved={handleRefresh}
        />
      )}

      <p className="text-[11px] text-terminal-muted">
        Support/resistance remains manual only · Link entries to Options Trade
        Tracker · Risk Dashboard in Phase 10
      </p>
    </div>
  );
}
