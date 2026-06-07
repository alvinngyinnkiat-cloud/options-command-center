"use client";

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import type { CapitalPoolsBreakdown } from "@/lib/portfolio/capital-pools";
import type { PortfolioCurrentState } from "@/lib/portfolio/daily-snapshot-types";
import type { PortfolioMetrics } from "@/lib/portfolio/types";
import {
  CashBreakdownSection,
  PortfolioSummarySection,
} from "./CashBreakdownSection";
import { AssetsUnderManagementSection } from "./AssetsUnderManagementSection";
import { PortfolioMarketIncomeSection } from "./PortfolioMarketIncomeSection";
import type { PortfolioIncomeSummary } from "@/lib/ticker-positions/market-types";
import { useDividendDataSync, type DividendDependentRefreshData } from "@/lib/dividends/use-dividend-sync";
import { ManualPortfolioOverrideCard } from "./ManualPortfolioOverrideCard";
import { AssetAllocationChart } from "./AssetAllocationChart";
import { HealthScorePanel } from "./HealthScorePanel";
import { LatestSnapshotSummaryCard } from "./LatestSnapshotSummaryCard";
import { PortfolioCurrentStateGrid } from "./PortfolioCurrentStateGrid";
import { DataHealthWidget } from "./DataHealthWidget";
import type { DataHealthWidgetLine } from "@/lib/data-health/types";
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
  const [capitalPools] = useState(initialPools);
  const [portfolioIncome, setPortfolioIncome] = useState(initialPortfolioIncome);
  const [currentState, setCurrentState] = useState(initialCurrentState);
  const [openRisk] = useState(initialOpenRisk);

  const handleDividendSync = useCallback((refresh: DividendDependentRefreshData) => {
    setPortfolioIncome(refresh.tickerData.portfolioIncome);
  }, []);
  useDividendDataSync(handleDividendSync);

  function handleMetricsChange(next: PortfolioMetrics) {
    setMetrics(next);
    setCurrentState((prev) => ({
      ...prev,
      portfolioValue: next.myPortfolioValue,
      availableRiskCapacity: next.availableRiskCapacity,
      cashAvailability: next.tradingCashSgd,
    }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio Dashboard"
        description="Current portfolio state — Trading Cash and Crypto Cash shown separately (SGD)"
        actions={
          <>
            <Badge variant={metrics.dataSource === "supabase" ? "success" : "outline"}>
              {metrics.dataSource === "supabase" ? "Live data" : "Mock data"}
            </Badge>
            {metrics.comparison.useManualOverride && (
              <Badge variant="info">Reconciliation active</Badge>
            )}
            <Button variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </>
        }
      />

      <ManualPortfolioOverrideCard
        metrics={metrics}
        onMetricsChange={handleMetricsChange}
      />

      <DataHealthWidget lines={dataHealthLines} />

      <PortfolioSummarySection pools={capitalPools} />

      <AssetsUnderManagementSection
        pools={capitalPools}
        recordedTotalAssetsManagedSgd={recordedTotalAssetsManagedSgd}
      />

      <PortfolioMarketIncomeSection
        pools={capitalPools}
        income={portfolioIncome}
      />

      <PortfolioCurrentStateGrid
        metrics={metrics}
        currentState={currentState}
        capitalPools={capitalPools}
      />

      <CashBreakdownSection pools={capitalPools} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AssetAllocationChart data={metrics.assetAllocation} />
        <HealthScorePanel health={metrics.healthScore} />
      </div>

      <LatestSnapshotSummaryCard latestSnapshot={metrics.snapshots[0] ?? null} />

      <p className="text-[10px] text-terminal-muted">
        Risk capacity and trade eligibility use Trading Capital and Trading Cash
        only. Crypto Cash is excluded. Open risk: {openRisk.toLocaleString()} SGD
        (total). Client value is separate from My Portfolio Value.
      </p>
    </div>
  );
}
