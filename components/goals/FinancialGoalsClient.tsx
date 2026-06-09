"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { MetricCardsGrid } from "@/components/ui/MetricCardsGrid";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { buildGoalsDashboardData } from "@/lib/goals/calculations";
import {
  formatGoalDateDisplay,
  formatProgressPercent,
  formatSGD,
} from "@/lib/goals/format";
import type { GoalsDashboardData } from "@/lib/goals/types";
import { DEFAULT_ASSUMED_YIELD_PCT } from "@/lib/goals/types";
import { mapContributionsToGoals } from "@/lib/contributions/map-to-goals";
import type { MonthlyContributionTrackerData } from "@/lib/contributions/types";
import type { PortfolioHistoryData } from "@/lib/portfolio/daily-snapshot-types";
import { MonthlyContributionTrackerPanel } from "@/components/contributions/MonthlyContributionTrackerPanel";
import { CategoryGoalsPanel } from "./CategoryGoalsPanel";
import { GoalChangeHistoryPanel } from "./GoalChangeHistoryPanel";
import { GoalSettingsPanel } from "./GoalSettingsPanel";
import { GoalsProjectionChart } from "./GoalsProjectionChart";
import { PassiveIncomeGoalPanel } from "./PassiveIncomeGoalPanel";
import { PortfolioGrowthHistorySection } from "./PortfolioGrowthHistorySection";
import { TimelineProjection } from "./TimelineProjection";
import { useDividendDataSync, type DividendDependentRefreshData } from "@/lib/dividends/use-dividend-sync";

interface FinancialGoalsClientProps {
  initialData: GoalsDashboardData;
  categoryValues: {
    usEtfValueSgd: number;
    usStockValueSgd: number;
    sgStockValueSgd: number;
  };
  portfolioHistory: PortfolioHistoryData;
  contributionData: MonthlyContributionTrackerData;
}

export function FinancialGoalsClient({
  initialData,
  categoryValues,
  portfolioHistory,
  contributionData: initialContributionData,
}: FinancialGoalsClientProps) {
  const [goalsData, setGoalsData] = useState(initialData);
  const [contributionData, setContributionData] = useState(
    initialContributionData
  );
  const [yieldPct, setYieldPct] = useState(
    initialData.raw.assumedYieldPct ?? DEFAULT_ASSUMED_YIELD_PCT
  );

  const handleDividendSync = useCallback((refresh: DividendDependentRefreshData) => {
    setGoalsData(refresh.goalsData);
  }, []);
  useDividendDataSync(handleDividendSync);

  const data = useMemo(() => {
    if (yieldPct === goalsData.raw.assumedYieldPct) {
      return goalsData;
    }
    return {
      ...buildGoalsDashboardData(
        goalsData.raw,
        goalsData.dataSource,
        yieldPct
      ),
      managedGoals: goalsData.managedGoals,
      changeHistory: goalsData.changeHistory,
    };
  }, [goalsData, yieldPct]);

  function handleContributionChange(next: MonthlyContributionTrackerData) {
    setContributionData(next);
    setGoalsData((prev) => ({
      ...buildGoalsDashboardData(
        {
          ...prev.raw,
          monthlyContributions: mapContributionsToGoals(next.contributions),
          averageMonthlyContribution: next.averageMonthlyContribution,
        },
        prev.dataSource,
        prev.raw.assumedYieldPct
      ),
      managedGoals: prev.managedGoals,
      changeHistory: prev.changeHistory,
    }));
  }

  const portfolioGoal = data.managedGoals.find(
    (g) => g.goalType === "net_worth" && !g.isArchived
  );
  const incomeGoal = data.managedGoals.find(
    (g) => g.goalType === "income" && !g.isArchived
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Financial Goals"
        description="Editable portfolio and passive income targets — My portfolio value only (excludes client capital)"
        actions={
          <Badge
            variant={data.dataSource === "supabase" ? "success" : "outline"}
          >
            {data.dataSource === "supabase" ? "Live data" : "Mock data"}
          </Badge>
        }
      />

      <GoalSettingsPanel data={data} onDataChange={setGoalsData} />

      {(portfolioGoal || data.portfolioGoal) && (
        <section className="space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
            Portfolio Breakdown
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CategoryGoalsPanel
              usEtfValueSgd={categoryValues.usEtfValueSgd}
              usStockValueSgd={categoryValues.usStockValueSgd}
              sgStockValueSgd={categoryValues.sgStockValueSgd}
              portfolioTargetSgd={data.portfolioGoal.targetValue}
            />
            <MetricCardsGrid>
              <StatCard
                label="Progress"
                value={formatProgressPercent(data.portfolioGoal.progressPercent)}
                change={`${formatSGD(data.portfolioGoal.currentValue)} of ${formatSGD(data.portfolioGoal.targetValue)}`}
                changeType="neutral"
              />
              <StatCard
                label="YTD Contributions"
                value={formatSGD(data.ytdContributions)}
                change={`S/O ${data.ytdContributionBreakdown.stockOptionsPct.toFixed(0)}% · Crypto ${data.ytdContributionBreakdown.cryptoPct.toFixed(0)}%`}
                changeType="neutral"
              />
              <StatCard
                label="Gap to Goal"
                value={formatSGD(
                  Math.max(
                    0,
                    data.portfolioGoal.targetValue -
                      data.portfolioGoal.currentValue
                  )
                )}
                change="Remaining"
                changeType="neutral"
              />
            </MetricCardsGrid>
          </div>
        </section>
      )}

      <PortfolioGrowthHistorySection
        initialHistory={portfolioHistory}
        goalsData={data}
      />

      <section className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Monthly Contributions
        </h2>
        <MonthlyContributionTrackerPanel
          initialData={contributionData}
          onDataChange={handleContributionChange}
        />
      </section>

      {(incomeGoal || data.passiveIncomeGoal) && (
        <PassiveIncomeGoalPanel
          data={data}
          passiveMetrics={data.passiveIncomeGoal}
          yieldPct={yieldPct}
          onYieldChange={setYieldPct}
          incomeGoalName={incomeGoal?.name}
          incomeTarget={data.passiveIncomeGoal.targetMonthly}
        />
      )}

      <section className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Projections
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GoalsProjectionChart timeline={data.timeline} />
          <TimelineProjection timeline={data.timeline} />
        </div>
        {data.portfolioGoal.estimatedCompletion && (
          <StatCard
            label="Target Completion"
            value={formatGoalDateDisplay(data.portfolioGoal.estimatedCompletion)}
            change={`Avg. ${formatSGD(data.raw.averageMonthlyContribution)}/mo contribution`}
            changeType="neutral"
          />
        )}
      </section>

      <GoalChangeHistoryPanel changes={data.changeHistory} />
    </div>
  );
}
