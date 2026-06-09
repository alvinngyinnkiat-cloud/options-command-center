"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import type { CryptoTrackerData, EnrichedCryptoHolding } from "@/lib/crypto/types";
import { Plus } from "lucide-react";
import { CryptoFormModal } from "./CryptoFormModal";
import { CryptoHoldingsTable } from "./CryptoHoldingsTable";
import { CryptoManualPortfolioCard } from "./CryptoManualPortfolioCard";
import { CryptoSummaryCards } from "./CryptoSummaryCards";
import { CryptoAllocationChart } from "./CryptoAllocationChart";
import { CryptoRankingsPanel } from "./CryptoRankingsPanel";
import { CryptoDeploymentPlanner } from "./CryptoDeploymentPlanner";

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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CryptoAllocationChart slices={initialData.allocationSlices} />
        <CryptoDeploymentPlanner
          cryptoCashSgd={initialData.portfolioManual.cryptoCashSgd}
          plan={initialData.deploymentPlan}
        />
      </div>

      <CryptoRankingsPanel rankings={initialData.rankings} />

      <CryptoManualPortfolioCard
        portfolioManual={initialData.portfolioManual}
        onSaved={handleRefresh}
      />

      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Optional Per-Asset Breakdown
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
        Coin Holdings Total includes all tokens and stablecoins. Available
        Exchange Cash is uninvested fiat only. Current Crypto Portfolio Value =
        Coin Holdings Total + Available Exchange Cash. Deployment Planner uses
        exchange cash only.
      </p>
    </div>
  );
}
