"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { splitOpenClosedHoldings } from "@/lib/crypto/allocation";
import type { CryptoTrackerData, EnrichedCryptoHolding } from "@/lib/crypto/types";
import { Plus } from "lucide-react";
import { CryptoFormModal } from "./CryptoFormModal";
import { CryptoHoldingsTable } from "./CryptoHoldingsTable";
import { CryptoManualPortfolioCard } from "./CryptoManualPortfolioCard";
import { CryptoSummaryCards } from "./CryptoSummaryCards";
import { CryptoAllocationChart } from "./CryptoAllocationChart";
import { CryptoHoldingsByTier } from "./CryptoHoldingsByTier";
import { CryptoDeploymentPlanner } from "./CryptoDeploymentPlanner";

interface CryptoTrackerClientProps {
  initialData: CryptoTrackerData;
}

export function CryptoTrackerClient({ initialData }: CryptoTrackerClientProps) {
  const [formHolding, setFormHolding] = useState<
    EnrichedCryptoHolding | null | undefined
  >(undefined);

  const { open, closed } = useMemo(
    () => splitOpenClosedHoldings(initialData.holdings),
    [initialData.holdings]
  );

  function handleRefresh() {
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Crypto Trade Tracker"
        description="Manual-only crypto tracking — enter SGD values directly. No live price feed."
        actions={
          <>
            <Badge variant="outline">Manual Update</Badge>
            <Badge
              variant={initialData.dataSource === "supabase" ? "success" : "outline"}
            >
              {initialData.dataSource === "supabase" ? "Saved" : "Mock data"}
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

      <CryptoSummaryCards portfolioManual={initialData.portfolioManual} />

      <CryptoManualPortfolioCard
        portfolioManual={initialData.portfolioManual}
        onSaved={handleRefresh}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CryptoAllocationChart slices={initialData.allocationSlices} />
        <CryptoDeploymentPlanner
          cryptoCashSgd={initialData.portfolioManual.cryptoCashSgd}
          plan={initialData.deploymentPlan}
        />
      </div>

      <CryptoHoldingsByTier tierGroups={initialData.tierGroups} />

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Open Positions
        </h2>
        <CryptoHoldingsTable
          holdings={open}
          variant="open"
          onEdit={(h) => setFormHolding(h)}
          onRefresh={handleRefresh}
          emptyMessage="No open positions. Add a holding or set Current SGD above zero."
        />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Closed Positions
        </h2>
        <CryptoHoldingsTable
          holdings={closed}
          variant="closed"
          onRefresh={handleRefresh}
          emptyMessage="No closed positions. Set Current SGD to zero to close a position."
        />
      </section>

      {formHolding !== undefined && (
        <CryptoFormModal
          holding={formHolding}
          onClose={() => setFormHolding(undefined)}
          onSaved={handleRefresh}
        />
      )}

      <p className="text-[11px] text-terminal-muted">
        Manual Portfolio is the source of truth for cash and contributions.
        Allocation chart uses four tiers (Top Holding, 2nd–5th, 6th–10th,
        Others). Positions with Current SGD &gt; 0 appear under Open Positions;
        zero-value positions move to Closed Positions automatically.
      </p>
    </div>
  );
}
