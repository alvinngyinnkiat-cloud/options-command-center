"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import type { CryptoTrackerData, EnrichedCryptoHolding } from "@/lib/crypto/types";
import { Plus } from "lucide-react";
import { CryptoFormModal } from "./CryptoFormModal";
import { CryptoHoldingsTable } from "./CryptoHoldingsTable";
import { CryptoSummaryCards } from "./CryptoSummaryCards";

interface CryptoTrackerClientProps {
  initialData: CryptoTrackerData;
}

export function CryptoTrackerClient({ initialData }: CryptoTrackerClientProps) {
  const [formHolding, setFormHolding] = useState<
    EnrichedCryptoHolding | null | undefined
  >(undefined);

  function handleRefresh() {
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Crypto Trade Tracker"
        description="Track crypto by total SGD invested — no buy price or coin quantity required"
        actions={
          <>
            <Badge
              variant={initialData.dataSource === "supabase" ? "success" : "outline"}
            >
              {initialData.dataSource === "supabase" ? "Live data" : "Mock data"}
            </Badge>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setFormHolding(null)}
            >
              <Plus className="h-4 w-4" />
              Add Holding
            </Button>
          </>
        }
      />

      <CryptoSummaryCards summary={initialData.summary} />

      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Holdings
        </h2>
        <CryptoHoldingsTable
          holdings={initialData.holdings}
          onEdit={(h) => setFormHolding(h)}
          onRefresh={handleRefresh}
        />
      </div>

      {formHolding !== undefined && (
        <CryptoFormModal
          holding={formHolding}
          onClose={() => setFormHolding(undefined)}
          onSaved={handleRefresh}
        />
      )}

      <p className="text-[11px] text-terminal-muted">
        Values in SGD · P/L = Current Value − Total Invested · Portfolio Dashboard
        crypto value syncs from this tracker
      </p>
    </div>
  );
}
