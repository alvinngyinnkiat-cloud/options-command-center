"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PortfolioGrowthChart } from "@/components/portfolio/PortfolioGrowthChart";
import type { PortfolioHistoryData } from "@/lib/portfolio/daily-snapshot-types";
import { getSingaporeSnapshotDate } from "@/lib/portfolio/snapshot-date";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import { GoalProgressAnalysisPanel } from "./GoalProgressAnalysisPanel";
import { MilestoneTrackerPanel } from "./MilestoneTrackerPanel";
import { formatSGD } from "@/lib/utils";
import type { GoalsDashboardData } from "@/lib/goals/types";

interface PortfolioGrowthHistorySectionProps {
  initialHistory: PortfolioHistoryData;
  goalsData: GoalsDashboardData;
}

export function PortfolioGrowthHistorySection({
  initialHistory,
  goalsData,
}: PortfolioGrowthHistorySectionProps) {
  const [history] = useState(initialHistory);
  const [showTargetLine, setShowTargetLine] = useState(true);
  const asOfDate =
    history.latest?.snapshotDate ??
    (history.dataSource === "supabase"
      ? getSingaporeSnapshotDate()
      : MOCK_REFERENCE_DATE);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
            Portfolio Performance
          </h2>
          <p className="mt-1 text-[11px] text-terminal-muted">
            Historical My Portfolio Value from saved snapshots — create snapshots
            on the Portfolio Dashboard
          </p>
        </div>
        <Badge
          variant={history.dataSource === "supabase" ? "success" : "outline"}
        >
          {history.dataSource === "supabase" ? "Live snapshots" : "Mock history"}
        </Badge>
      </div>

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
              {formatSGD(goalsData.portfolioGoal.targetValue)})
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

      <GoalProgressAnalysisPanel data={goalsData} />
    </section>
  );
}
