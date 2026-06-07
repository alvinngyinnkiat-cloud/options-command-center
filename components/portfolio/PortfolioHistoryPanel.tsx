"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { CreateSnapshotButton } from "./CreateSnapshotButton";
import { PortfolioGrowthChart } from "./PortfolioGrowthChart";
import { PortfolioHistoryComparisons } from "./PortfolioHistoryComparisons";
import { PortfolioMilestonesCard } from "./PortfolioMilestonesCard";
import { PortfolioPerformanceMetricsCard } from "./PortfolioPerformanceMetricsCard";
import type { PortfolioHistoryData } from "@/lib/portfolio/daily-snapshot-types";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";

interface PortfolioHistoryPanelProps {
  initialHistory: PortfolioHistoryData;
}

export function PortfolioHistoryPanel({
  initialHistory,
}: PortfolioHistoryPanelProps) {
  const [history, setHistory] = useState(initialHistory);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
            Portfolio History
          </h2>
          <p className="mt-1 text-[11px] text-terminal-muted">
            Official daily snapshot database · one record per day
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={history.dataSource === "supabase" ? "success" : "outline"}
          >
            {history.dataSource === "supabase" ? "Live snapshots" : "Mock history"}
          </Badge>
          <CreateSnapshotButton onUpdated={setHistory} />
        </div>
      </div>

      <PortfolioHistoryComparisons comparisons={history.comparisons} />

      <PortfolioPerformanceMetricsCard performance={history.performance} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PortfolioGrowthChart
          snapshots={history.snapshots}
          asOfDate={MOCK_REFERENCE_DATE}
        />
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
            Milestones
          </h3>
          <PortfolioMilestonesCard milestones={history.milestones} />
        </div>
      </div>
    </section>
  );
}
