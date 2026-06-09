import { MetricCardsGrid } from "@/components/ui/MetricCardsGrid";
import { StatCard } from "@/components/ui/StatCard";
import type { PortfolioGoalMetrics } from "@/lib/goals/types";
import { formatCagr, formatGoalDateDisplay } from "@/lib/goals/format";

interface CAGRProjectionCardsProps {
  portfolioGoal: PortfolioGoalMetrics;
}

export function CAGRProjectionCards({ portfolioGoal }: CAGRProjectionCardsProps) {
  const requiredType: "positive" | "negative" | "neutral" =
    portfolioGoal.requiredCagr <= portfolioGoal.actualCagr
      ? "positive"
      : "neutral";

  const actualType =
    portfolioGoal.actualCagr >= 0 ? "positive" : "negative";

  return (
    <MetricCardsGrid gap="lg">
      <StatCard
        label="Required CAGR"
        value={formatCagr(portfolioGoal.requiredCagr)}
        change={
          portfolioGoal.targetDate
            ? `To reach target by ${formatGoalDateDisplay(portfolioGoal.targetDate)}`
            : "Based on projected timeline"
        }
        changeType={requiredType}
      />
      <StatCard
        label="Actual CAGR"
        value={formatCagr(portfolioGoal.actualCagr)}
        change="Historical annualized return"
        changeType={actualType}
      />
      <StatCard
        label="Est. Completion"
        value={
          portfolioGoal.estimatedCompletion
            ? formatGoalDateDisplay(portfolioGoal.estimatedCompletion)
            : "—"
        }
        change="At current CAGR + contributions"
        changeType="neutral"
      />
      <StatCard
        label="Target Date"
        value={
          portfolioGoal.targetDate
            ? formatGoalDateDisplay(portfolioGoal.targetDate)
            : "Not set"
        }
        change={formatCagr(
          Math.max(0, portfolioGoal.requiredCagr - portfolioGoal.actualCagr)
        ) + " CAGR gap"}
        changeType={
          portfolioGoal.requiredCagr > portfolioGoal.actualCagr
            ? "negative"
            : "positive"
        }
      />
    </MetricCardsGrid>
  );
}
