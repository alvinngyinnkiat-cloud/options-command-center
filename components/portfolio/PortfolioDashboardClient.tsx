"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import type { CapitalPoolsBreakdown } from "@/lib/portfolio/capital-pools";
import type { PersonalPortfolioProfitLoss } from "@/lib/portfolio/personal-profit-loss";
import type { PortfolioMetrics } from "@/lib/portfolio/types";
import { ManualPortfolioOverrideCard } from "./ManualPortfolioOverrideCard";
import { PortfolioOwnershipSplitSection } from "./PortfolioOwnershipSplitSection";
import { PortfolioProfitLossSection } from "./PortfolioProfitLossSection";
import { DataHealthWidget } from "./DataHealthWidget";
import type { DataHealthWidgetLine } from "@/lib/data-health/types";
import { RefreshCw } from "lucide-react";

interface PortfolioDashboardClientProps {
  initialMetrics: PortfolioMetrics;
  capitalPools: CapitalPoolsBreakdown;
  personalProfitLoss: PersonalPortfolioProfitLoss;
  dataHealthLines: DataHealthWidgetLine[];
}

export function PortfolioDashboardClient({
  initialMetrics,
  capitalPools: initialPools,
  personalProfitLoss: initialProfitLoss,
  dataHealthLines,
}: PortfolioDashboardClientProps) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [capitalPools, setCapitalPools] = useState(initialPools);
  const [personalProfitLoss, setPersonalProfitLoss] = useState(initialProfitLoss);

  function applyPortfolioRefresh(
    next: PortfolioMetrics,
    pools: CapitalPoolsBreakdown
  ) {
    setMetrics(next);
    setCapitalPools(pools);
    setPersonalProfitLoss((prev) => ({
      ...prev,
      myPortfolioValue: pools.myPortfolioValue,
      myPortfolioPnl: pools.myPortfolioValue - prev.totalContributionsSgd,
      myReturnPct:
        prev.totalContributionsSgd > 0
          ? ((pools.myPortfolioValue - prev.totalContributionsSgd) /
              prev.totalContributionsSgd) *
            100
          : 0,
    }));
  }

  function handleManualBreakdownSaved(
    next: PortfolioMetrics,
    pools: CapitalPoolsBreakdown
  ) {
    applyPortfolioRefresh(next, pools);
  }

  function handleClientPortfolioSaved(
    next: PortfolioMetrics,
    pools: CapitalPoolsBreakdown
  ) {
    applyPortfolioRefresh(next, pools);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio Dashboard"
        description="Personal profit and loss, ownership split, and manual portfolio values"
        actions={
          <>
            <Badge variant={metrics.dataSource === "supabase" ? "success" : "outline"}>
              {metrics.dataSource === "supabase" ? "Live data" : "Mock data"}
            </Badge>
            <Button variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </>
        }
      />

      <PortfolioProfitLossSection profitLoss={personalProfitLoss} />

      <PortfolioOwnershipSplitSection
        metrics={metrics}
        pools={capitalPools}
        onSaved={handleClientPortfolioSaved}
      />

      <section className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Manual Portfolio Breakdown
        </h2>
        <ManualPortfolioOverrideCard
          metrics={metrics}
          pools={capitalPools}
          onSaved={handleManualBreakdownSaved}
        />
      </section>

      <DataHealthWidget lines={dataHealthLines} />
    </div>
  );
}
