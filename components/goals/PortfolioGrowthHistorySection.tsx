"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PortfolioGrowthChart } from "@/components/portfolio/PortfolioGrowthChart";
import type { PortfolioHistoryData } from "@/lib/portfolio/daily-snapshot-types";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import { DailyPortfolioTrackerCard } from "./DailyPortfolioTrackerCard";
import { GoalProgressAnalysisPanel } from "./GoalProgressAnalysisPanel";
import { MilestoneTrackerPanel } from "./MilestoneTrackerPanel";
import { PortfolioHistoryTable } from "./PortfolioHistoryTable";
import type { GoalsDashboardData } from "@/lib/goals/types";

interface PortfolioGrowthHistorySectionProps {
  initialHistory: PortfolioHistoryData;
  goalsData: GoalsDashboardData;
}

export function PortfolioGrowthHistorySection({
  initialHistory,
  goalsData,
}: PortfolioGrowthHistorySectionProps) {
  const [history, setHistory] = useState(initialHistory);
  const [showTargetLine, setShowTargetLine] = useState(true);
  const asOfDate = history.latest?.snapshotDate ?? MOCK_REFERENCE_DATE;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
            Portfolio Growth &amp; History
          </h2>
          <p className="mt-1 text-[11px] text-terminal-muted">
            Long-term goal tracking and performance measurement — SGD values, My
            portfolio only
          </p>
        </div>
        <Badge
          variant={history.dataSource === "supabase" ? "success" : "outline"}
        >
          {history.dataSource === "supabase" ? "Live snapshots" : "Mock history"}
        </Badge>
      </div>

      <DailyPortfolioTrackerCard
        history={history}
        onHistoryChange={setHistory}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px]"
              onClick={() => setShowTargetLine((v) => !v)}
            >
              {showTargetLine ? "Hide" : "Show"} target line (
              {goalsData.portfolioGoal.targetValue.toLocaleString()} SGD)
            </Button>
          </div>
          <PortfolioGrowthChart
            snapshots={history.snapshots}
            asOfDate={asOfDate}
            targetValue={
              showTargetLine ? goalsData.portfolioGoal.targetValue : null
            }
            targetLabel="Goal"
          />
        </div>
        <MilestoneTrackerPanel
          snapshots={history.snapshots}
          milestones={history.milestones}
        />
      </div>

      <PortfolioHistoryTable history={history} onHistoryChange={setHistory} />

      <GoalProgressAnalysisPanel data={goalsData} />
    </section>
  );
}
