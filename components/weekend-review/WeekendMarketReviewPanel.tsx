"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runWeekendMarketReview } from "@/app/actions/weekend-review";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatReviewDateLabel } from "@/lib/weekend-review/dates";
import type {
  WeekendMarketReviewResult,
  WeekendReviewStatus,
} from "@/lib/weekend-review/types";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import { cn } from "@/lib/utils";
import { BookOpenCheck, CalendarClock, Loader2 } from "lucide-react";

interface WeekendMarketReviewPanelProps {
  initialStatus: WeekendReviewStatus;
  variant?: "compact" | "card";
  onReviewComplete?: (
    result: WeekendMarketReviewResult,
    rows: WatchlistScannerRow[]
  ) => void;
}

export function WeekendMarketReviewPanel({
  initialStatus,
  variant = "card",
  onReviewComplete,
}: WeekendMarketReviewPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<WeekendMarketReviewResult | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  function handleReview() {
    setError(null);
    startTransition(async () => {
      const result = await runWeekendMarketReview();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStatus(result.status);
      setLastResult(result);
      onReviewComplete?.(result, result.rows);
      router.refresh();
    });
  }

  const content = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-terminal-text">
              Weekend Market Review
            </h3>
            {status.isDue && (
              <Badge variant="warning" className="text-[10px]">
                Due
              </Badge>
            )}
          </div>
          <p className="text-xs text-terminal-muted max-w-xl">
            Weekly review before the new trading week. Refreshes market data,
            indicators, scores, and rankings. Manual support/resistance levels
            are never changed — only snapshotted to history.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReview}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BookOpenCheck className="h-4 w-4" />
          )}
          {isPending ? "Running review…" : "Run Weekend Market Review"}
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-terminal-border bg-terminal-elevated/40 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
            Last Weekend Review
          </p>
          <p className="mt-0.5 text-sm font-medium text-terminal-text">
            {status.lastReviewDate
              ? formatReviewDateLabel(status.lastReviewDate)
              : "Not yet run"}
          </p>
        </div>
        <div className="rounded-md border border-terminal-border bg-terminal-elevated/40 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-terminal-muted flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            Next Review Due
          </p>
          <p
            className={cn(
              "mt-0.5 text-sm font-medium",
              status.isDue ? "text-warning" : "text-terminal-text"
            )}
          >
            {formatReviewDateLabel(status.nextReviewDueDate)}
          </p>
        </div>
      </div>

      {lastResult && (
        <p className="mt-2 text-xs text-profit">
          Review complete — {lastResult.rankings.length} tickers ranked,{" "}
          {lastResult.snapshots.length} S/R snapshots saved.
        </p>
      )}

      {error && (
        <p className="mt-2 text-xs text-loss">{error}</p>
      )}
    </>
  );

  if (variant === "compact") {
    return <div className="flex flex-col gap-2">{content}</div>;
  }

  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4">
      {content}
    </div>
  );
}
