"use client";

import { StatCard } from "@/components/ui/StatCard";
import type { PortfolioMilestones } from "@/lib/portfolio/daily-snapshot-types";
import { formatCurrency } from "@/lib/utils";

interface PortfolioMilestonesCardProps {
  milestones: PortfolioMilestones;
}

export function PortfolioMilestonesCard({
  milestones,
}: PortfolioMilestonesCardProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Highest Value"
        value={
          milestones.highest
            ? formatCurrency(milestones.highest.value)
            : "—"
        }
        change={milestones.highest?.date}
      />
      <StatCard
        label="Lowest Value"
        value={
          milestones.lowest ? formatCurrency(milestones.lowest.value) : "—"
        }
        change={milestones.lowest?.date}
      />
      <StatCard
        label="Current Value"
        value={
          milestones.current != null
            ? formatCurrency(milestones.current)
            : "—"
        }
      />
      <StatCard
        label="Average Value"
        value={
          milestones.average != null
            ? formatCurrency(milestones.average)
            : "—"
        }
      />
    </div>
  );
}
