"use client";

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCardsGrid } from "@/components/ui/MetricCardsGrid";
import { StatCard } from "@/components/ui/StatCard";
import type { CapitalPoolsBreakdown } from "@/lib/portfolio/capital-pools";
import type {
  PortfolioCurrentState,
} from "@/lib/portfolio/daily-snapshot-types";
import type { PortfolioMetrics } from "@/lib/portfolio/types";
import { AssetsUnderManagementSection } from "./AssetsUnderManagementSection";
import { PortfolioMarketIncomeSection } from "./PortfolioMarketIncomeSection";
import type { PortfolioIncomeSummary } from "@/lib/ticker-positions/market-types";
import { useDividendDataSync, type DividendDependentRefreshData } from "@/lib/dividends/use-dividend-sync";
import { ManualPortfolioOverrideCard } from "./ManualPortfolioOverrideCard";
import { PortfolioOwnershipSplitSection } from "./PortfolioOwnershipSplitSection";
import { AssetAllocationChart } from "./AssetAllocationChart";
import { HealthScorePanel } from "./HealthScorePanel";
import { LatestSnapshotSummaryCard } from "./LatestSnapshotSummaryCard";
import { PortfolioCurrentStateGrid } from "./PortfolioCurrentStateGrid";
import { DataHealthWidget } from "./DataHealthWidget";
import type { DataHealthWidgetLine } from "@/lib/data-health/types";
import { formatNumber } from "@/lib/format/currency";
import { formatSGD } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface PortfolioDashboardClientProps {
  initialMetrics: PortfolioMetrics;
  capitalPools: CapitalPoolsBreakdown;
  portfolioIncome: PortfolioIncomeSummary;
  currentState: PortfolioCurrentState;
  openRisk: number;
  dataHealthLines: DataHealthWidgetLine[];
  recordedTotalAssetsManagedSgd?: number | null;
}

export function PortfolioDashboardClient({
  initialMetrics,
  capitalPools: initialPools,
  portfolioIncome: initialPortfolioIncome,
  currentState: initialCurrentState,
  openRisk: initialOpenRisk,
  dataHealthLines,
  recordedTotalAssetsManagedSgd,
}: PortfolioDashboardClientProps) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [capitalPools, setCapitalPools] = useState(initialPools);
  const [portfolioIncome, setPortfolioIncome] = useState(initialPortfolioIncome);
  const [currentState, setCurrentState] = useState(initialCurrentState);
  const [openRisk] = useState(initialOpenRisk);

  const handleDividendSync = useCallback((refresh: DividendDependentRefreshData) => {
    setPortfolioIncome(refresh.tickerData.portfolioIncome);
  }, []);
  useDividendDataSync(handleDividendSync);

  function applyPortfolioRefresh(
    next: PortfolioMetrics,
    pools: CapitalPoolsBreakdown
  ) {
    setMetrics(next);
    setCapitalPools(pools);
    setCurrentState((prev) => ({
      ...prev,
      portfolioValue: next.myPortfolioValue,
      availableRiskCapacity: next.availableRiskCapacity,
      cashAvailability: pools.tradingCashSgd,
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
        description="Ownership split, manual portfolio breakdown, trading capital, and holdings"
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

      <PortfolioOwnershipSplitSection
        metrics={metrics}
        pools={capitalPools}
        onSaved={handleClientPortfolioSaved}
      />

      <ManualPortfolioOverrideCard
        metrics={metrics}
        pools={capitalPools}
        onSaved={handleManualBreakdownSaved}
      />

      <section className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Trading Capital & Risk
        </h2>
        <PortfolioCurrentStateGrid
          metrics={metrics}
          currentState={currentState}
          capitalPools={capitalPools}
        />
        <MetricCardsGrid>
          <StatCard
            label="Trading Capital"
            value={formatSGD(capitalPools.tradingCapital)}
            change="US/SG + Trading Cash SGD + options — excludes crypto"
            changeType="neutral"
          />
        </MetricCardsGrid>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Asset Allocation
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AssetAllocationChart data={metrics.assetAllocation} />
          <HealthScorePanel health={metrics.healthScore} />
        </div>
      </section>

      <PortfolioMarketIncomeSection
        pools={capitalPools}
        income={portfolioIncome}
      />

      <AssetsUnderManagementSection
        pools={capitalPools}
        recordedTotalAssetsManagedSgd={recordedTotalAssetsManagedSgd}
      />

      <DataHealthWidget lines={dataHealthLines} />

      <LatestSnapshotSummaryCard latestSnapshot={metrics.snapshots[0] ?? null} />

      <p className="text-[10px] text-terminal-muted">
        Risk capacity and trade eligibility use Trading Capital and Trading Cash
        only. Crypto Value includes coins and stablecoins as one line. Open risk:{" "}
        {formatNumber(openRisk)} SGD (total). Client value is separate from My
        Portfolio Value.
      </p>
    </div>
  );
}
