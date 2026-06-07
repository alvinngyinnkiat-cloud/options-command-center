import { StatCard } from "@/components/ui/StatCard";
import type { WeekendReviewSummary } from "@/lib/weekend-review/types";

interface WeekendReviewSummaryCardsProps {
  summary: WeekendReviewSummary;
}

export function WeekendReviewSummaryCards({
  summary,
}: WeekendReviewSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      <StatCard label="Total Tickers" value={String(summary.totalTickers)} />
      <StatCard
        label="Updated This Weekend"
        value={String(summary.updatedThisWeekend)}
        changeType="positive"
      />
      <StatCard
        label="Needs Review"
        value={String(summary.needsReview)}
        changeType={summary.needsReview > 0 ? "negative" : "neutral"}
      />
      <StatCard
        label="Bull Put"
        value={String(summary.bullPutCandidates)}
        changeType="positive"
      />
      <StatCard
        label="Bear Call"
        value={String(summary.bearCallCandidates)}
        changeType="negative"
      />
      <StatCard
        label="Iron Condor"
        value={String(summary.ironCondorCandidates)}
        changeType="neutral"
      />
      <StatCard label="No Trade" value={String(summary.noTradeCount)} />
      <StatCard
        label="Best Opportunity"
        value={summary.bestOpportunityTicker ?? "—"}
        change={`${summary.bestOpportunityStrategy ?? ""} · Score ${summary.highestScore}`}
      />
    </div>
  );
}
