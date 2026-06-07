"use client";

import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import type { TradeQueuePageData } from "@/lib/trading-workflow/types";
import { ActiveTickerExposureTable } from "./ActiveTickerExposureTable";
import { MarketConditionPanel } from "./MarketConditionPanel";
import { TradeQueueTable } from "./TradeQueueTable";
import { TradeReadinessPanel } from "./TradeReadinessPanel";

interface TradeQueueClientProps {
  initialData: TradeQueuePageData;
}

export function TradeQueueClient({ initialData }: TradeQueueClientProps) {
  const topReadiness = initialData.allReadiness[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trade Queue"
        description="Top-ranked trade opportunities — focus on highest-quality setups first"
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
        Sorted by score, strategy, action, risk eligibility, and liquidity ·
        Average Price for analysis · S/R manual only · One active trade per ticker
      </div>

      <MarketConditionPanel condition={initialData.marketCondition} />

      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Top 5 Trade Queue
        </h2>
        <TradeQueueTable items={initialData.tradeQueue} />
      </div>

      {topReadiness && (
        <TradeReadinessPanel readiness={topReadiness} />
      )}

      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Ticker Exposure
        </h2>
        <ActiveTickerExposureTable rows={initialData.activeTickerExposure} />
      </div>
    </div>
  );
}
