"use client";

import { useState, useTransition } from "react";
import type { WeekendMarketReviewResult } from "@/lib/weekend-review/types";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { buildWeekendReviewPageData } from "@/lib/weekend-review/page-data";
import type { WeekendReviewPageData } from "@/lib/weekend-review/types";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";
import { WeekendMarketReviewPanel } from "./WeekendMarketReviewPanel";
import { WeekendOpportunitiesPanel } from "./WeekendOpportunitiesPanel";
import { WeekendReviewHistoryTable } from "./WeekendReviewHistoryTable";
import { WeekendReviewProgress } from "./WeekendReviewProgress";
import { WeekendReviewSrForm } from "./WeekendReviewSrForm";
import { WeekendReviewWorkflowSteps } from "./WeekendReviewWorkflowSteps";
import { WeekendReviewStatusTable } from "./WeekendReviewStatusTable";
import { WeekendReviewSummaryCards } from "./WeekendReviewSummaryCards";
import { WeekendWorkflowAlerts } from "./WeekendWorkflowAlerts";
import { TradeQueueTable } from "@/components/trading-workflow/TradeQueueTable";
import type { TradeQueueItem } from "@/lib/trading-workflow/types";

interface WeekendReviewClientProps {
  initialData: WeekendReviewPageData;
}

export function WeekendReviewClient({ initialData }: WeekendReviewClientProps) {
  const [data, setData] = useState(initialData);
  const [selectedTickerId, setSelectedTickerId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [reviewComplete, setReviewComplete] = useState(false);
  const [tradeQueue, setTradeQueue] = useState<TradeQueueItem[]>([]);
  const [, startTransition] = useTransition();

  function applyRows(rows: WatchlistScannerRow[], dataSource: "supabase" | "mock") {
    const next = buildWeekendReviewPageData({
      rows,
      status: data.status,
      history: data.history,
      dataSource,
    });
    setData(next);
  }

  function handleReviewComplete(result: WeekendMarketReviewResult) {
    setReviewComplete(true);
    setTradeQueue(result.tradeQueue);
    setData({
      rows: result.rows,
      status: result.status,
      history: [...result.snapshots, ...data.history],
      summary: result.summary,
      opportunities: result.opportunities,
      reviewStatusRows: result.reviewStatusRows,
      alerts: result.alerts,
      dataSource: result.dataSource,
    });
    setActiveStep(3);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekend Market Review"
        description="Weekly workflow — manual S/R, market refresh, scores, and next week's trade opportunities"
        actions={
          <Badge variant={data.dataSource === "supabase" ? "success" : "outline"}>
            {data.dataSource === "supabase" ? "Live data" : "Mock data"}
          </Badge>
        }
      />

      <WeekendReviewProgress activeStep={activeStep} />

      <section id="review-summary">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Review Summary
        </h2>
        <WeekendReviewSummaryCards summary={data.summary} />
      </section>

      <section id="workflow-steps">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Automated Refresh Steps
        </h2>
        <WeekendReviewWorkflowSteps lastRunComplete={reviewComplete} />
      </section>

      <section id="run-review">
        <WeekendMarketReviewPanel
          initialStatus={data.status}
          onReviewComplete={(result) => {
            handleReviewComplete(result);
            startTransition(() => {});
          }}
        />
      </section>

      <section id="workflow-alerts">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Weekend Alerts
        </h2>
        <WeekendWorkflowAlerts alerts={data.alerts} />
      </section>

      <section id="review-status">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Watchlist Review Status
        </h2>
        <WeekendReviewStatusTable
          rows={data.reviewStatusRows}
          onSelectTicker={(id) => {
            setSelectedTickerId(id);
            setActiveStep(1);
          }}
        />
      </section>

      <section id="sr-update">
        <WeekendReviewSrForm
          rows={data.rows}
          selectedWatchlistId={selectedTickerId}
          onSaved={(rows, source) => {
            applyRows(rows, source);
            setActiveStep(2);
          }}
        />
      </section>

      <section id="opportunities">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Top Opportunities
        </h2>
        <WeekendOpportunitiesPanel opportunities={data.opportunities} />
      </section>

      {tradeQueue.length > 0 && (
        <section id="trade-queue">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
            Trade Queue (Generated After Review)
          </h2>
          <TradeQueueTable items={tradeQueue} />
        </section>
      )}

      <section id="review-notes">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Review Notes
        </h2>
        <textarea
          className="w-full min-h-[120px] rounded-lg border border-terminal-border bg-terminal-elevated px-3 py-2 text-sm text-terminal-text"
          placeholder="Weekly analyst notes — market context, macro view, trade plan for next week…"
          value={reviewNotes}
          onChange={(e) => {
            setReviewNotes(e.target.value);
            setActiveStep(4);
          }}
        />
      </section>

      <section id="review-history">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Review History
        </h2>
        <WeekendReviewHistoryTable history={data.history} />
      </section>

      <p className="text-[11px] text-terminal-muted">
        Average Price drives all scoring · Current Price display-only · S/R manual
        only · Run Weekend Market Review never modifies support/resistance
      </p>
    </div>
  );
}
