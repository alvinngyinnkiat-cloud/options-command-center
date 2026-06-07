import Link from "next/link";
import type { MarketConditionResult, TradeQueueItem } from "@/lib/trading-workflow/types";
import { MarketConditionPanel } from "./MarketConditionPanel";
import { TradeQueueTable } from "./TradeQueueTable";

interface PortfolioWorkflowPanelProps {
  marketCondition: MarketConditionResult;
  tradeQueue: TradeQueueItem[];
}

export function PortfolioWorkflowPanel({
  marketCondition,
  tradeQueue,
}: PortfolioWorkflowPanelProps) {
  const topThree = tradeQueue.slice(0, 3);

  return (
    <div className="space-y-4">
      <MarketConditionPanel condition={marketCondition} compact />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
            Top Trade Queue
          </h2>
          <Link
            href="/trade-queue"
            className="text-[11px] text-accent hover:underline"
          >
            View full queue →
          </Link>
        </div>
        <TradeQueueTable items={topThree} />
      </div>
    </div>
  );
}
