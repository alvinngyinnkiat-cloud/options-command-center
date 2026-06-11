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
import { GoalChangeHistoryPanel } from "./GoalChangeHistoryPanel";
import { GoalSettingsPanel } from "./GoalSettingsPanel";
import { GoalsProjectionChart } from "./GoalsProjectionChart";
import { PassiveIncomeGoalPanel } from "./PassiveIncomeGoalPanel";
import { PortfolioGrowthHistorySection } from "./PortfolioGrowthHistorySection";
import { TimelineProjection } from "./TimelineProjection";
import { useDividendDataSync, type DividendDependentRefreshData } from "@/lib/dividends/use-dividend-sync";

interface FinancialGoalsClientProps {
  initialData: GoalsDashboardData;
  portfolioHistory: PortfolioHistoryData;
  contributionData: MonthlyContributionTrackerData;
}

export function FinancialGoalsClient({
  initialData,
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
          <MetricCardsGrid>
            <StatCard
              label="Total Contribution"
              value={formatSGD(contributionData.allTimeContributions)}
              change="Monthly Contribution Tracker — all years"
              changeType="neutral"
            />
            <StatCard
              label="Progress"
              value={formatProgressPercent(data.portfolioGoal.progressPercent)}
              change={`${formatSGD(data.portfolioGoal.currentValue)} of ${formatSGD(data.portfolioGoal.targetValue)}`}
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
              change="Goal − My Portfolio Value"
              changeType="neutral"
            />
          </MetricCardsGrid>
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
