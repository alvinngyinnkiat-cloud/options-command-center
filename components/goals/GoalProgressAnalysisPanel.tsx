"use client";

import { MetricCardsGrid } from "@/components/ui/MetricCardsGrid";
import { StatCard } from "@/components/ui/StatCard";
import { MonthlyContributionTracker } from "@/components/goals/MonthlyContributionTracker";
import type { GoalsDashboardData } from "@/lib/goals/types";
import {
  formatCagr,
  formatGoalDateDisplay,
  formatProgressPercent,
  formatSGD,
} from "@/lib/goals/format";

interface GoalProgressAnalysisPanelProps {
  data: GoalsDashboardData;
}

export function GoalProgressAnalysisPanel({ data }: GoalProgressAnalysisPanelProps) {
  const goal = data.portfolioGoal;
  const referenceYear = data.raw.asOfDate
    ? Number(data.raw.asOfDate.slice(0, 4))
    : new Date().getFullYear();

  const recentContributions = [...data.monthlyContributions]
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .slice(0, 3);

  const contributionTrend =
    recentContributions.length > 0
      ? recentContributions
          .map((c) => `${c.monthLabel}: ${formatSGD(c.totalAmountSgd)}`)
          .join(" · ")
      : "No contributions recorded";

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
        Goal Progress Analysis
      </h3>

      <MetricCardsGrid>
        <StatCard
          label="Current Value"
          value={formatSGD(goal.currentValue)}
          change="Latest daily portfolio record"
          changeType="neutral"
        />
        <StatCard
          label="Target Value"
          value={formatSGD(goal.targetValue)}
          change={
            goal.targetDate
              ? `By ${formatGoalDateDisplay(goal.targetDate)}`
              : "Portfolio goal"
          }
          changeType="neutral"
        />
        <StatCard
          label="Progress"
          value={formatProgressPercent(goal.progressPercent)}
          change={`${formatSGD(goal.currentValue)} of ${formatSGD(goal.targetValue)}`}
          changeType="neutral"
        />
        <StatCard
          label="Required CAGR"
          value={formatCagr(goal.requiredCagr)}
          change="To reach target on schedule"
          changeType={
            goal.requiredCagr <= goal.actualCagr ? "positive" : "neutral"
          }
        />
        <StatCard
          label="Actual CAGR"
          value={formatCagr(goal.actualCagr)}
          change="From daily portfolio history"
          changeType={goal.actualCagr >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Est. Completion"
          value={
            goal.estimatedCompletion
              ? formatGoalDateDisplay(goal.estimatedCompletion)
              : "—"
          }
          change="At current CAGR + contributions"
          changeType="neutral"
        />
      </MetricCardsGrid>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatCard
          label="Monthly Contribution Trend"
          value={formatSGD(data.raw.averageMonthlyContribution)}
          change={contributionTrend}
          changeType="neutral"
          className="h-full"
        />
        <StatCard
          label="YTD Contributions"
          value={formatSGD(data.ytdContributions)}
          change={`S/O ${data.ytdContributionBreakdown.stockOptionsPct.toFixed(0)}% · Crypto ${data.ytdContributionBreakdown.cryptoPct.toFixed(0)}%`}
          changeType="neutral"
        />
        <MonthlyContributionTracker
          contributions={data.monthlyContributions}
          ytdTotal={data.ytdContributions}
          ytdBreakdown={data.ytdContributionBreakdown}
          currentYear={referenceYear}
        />
      </div>

      <p className="text-[10px] text-terminal-muted">
        Goal progress, CAGR, and projections use the latest daily portfolio record
        (My portfolio only). Client P/L remains separate.
      </p>
    </div>
  );
}
