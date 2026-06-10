"use client";

import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import type { TradeQueuePageData } from "@/lib/trading-workflow/types";
import { ActiveTickerExposureTable } from "./ActiveTickerExposureTable";
import { MarketConditionPanel } from "./MarketConditionPanel";
import { TradeQueueTable } from "./TradeQueueTable";

interface TradeQueueClientProps {
  initialData: TradeQueuePageData;
}

export function TradeQueueClient({ initialData }: TradeQueueClientProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Trade Queue"
        description="Main system and 20 EMA recommendations — sorted by Strategy Fit, then EMA Score"
        actions={
          <Badge
            variant={
              initialData.dataSource === "supabase" ? "success" : "outline"
            }
          >
            {initialData.dataSource === "supabase" ? "Live data" : "Mock data"}
          </Badge>
        }
      />

      <div className="rounded-lg border border-terminal-border bg-terminal-elevated/40 px-4 py-3 text-xs text-terminal-muted">
        Main recommended first (highest Strategy Fit), then 20 EMA-only setups
        (highest EMA Score) · Confluence is informational only · No Trade
        excluded
      </div>

      <MarketConditionPanel condition={initialData.marketCondition} />

      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Trade Queue
        </h2>
        <TradeQueueTable items={initialData.tradeQueue} />
      </div>

      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Ticker Exposure
        </h2>
        <ActiveTickerExposureTable rows={initialData.activeTickerExposure} />
      </div>
    </div>
  );
}
