"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { EnrichedStockEtfHolding } from "@/lib/stocks-etfs/types";
import { StockEtfBuySellModal } from "./StockEtfBuySellModal";
import { StockEtfEditPositionModal } from "./StockEtfEditPositionModal";
import { StockEtfPositionHistoryModal } from "./StockEtfPositionHistoryModal";

type ActiveModal =
  | { type: "buy" }
  | { type: "sell" }
  | { type: "edit" }
  | { type: "transactions" }
  | { type: "adjustments" }
  | null;

interface StockEtfPositionActionsProps {
  holding: EnrichedStockEtfHolding;
  onRefresh: () => void;
  compact?: boolean;
}

export function StockEtfPositionActions({
  holding,
  onRefresh,
  compact = false,
}: StockEtfPositionActionsProps) {
  const [active, setActive] = useState<ActiveModal>(null);

  const btnClass = compact ? "text-[10px] px-1.5 py-0.5 h-7" : "text-xs";

  return (
    <>
      <div className={`flex flex-wrap gap-1 ${compact ? "" : "mt-2"}`}>
        <Button
          variant="secondary"
          size="sm"
          className={btnClass}
          onClick={() => setActive({ type: "buy" })}
        >
          Add Buy
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className={btnClass}
          onClick={() => setActive({ type: "sell" })}
        >
          Add Sell
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className={btnClass}
          onClick={() => setActive({ type: "edit" })}
        >
          Edit Position
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={btnClass}
          onClick={() => setActive({ type: "transactions" })}
        >
          View Transactions
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={btnClass}
          onClick={() => setActive({ type: "adjustments" })}
        >
          View Adjustment History
        </Button>
      </div>

      {active?.type === "buy" && (
        <StockEtfBuySellModal
          holding={holding}
          transactionType="buy"
          onClose={() => setActive(null)}
          onSaved={onRefresh}
        />
      )}
      {active?.type === "sell" && (
        <StockEtfBuySellModal
          holding={holding}
          transactionType="sell"
          onClose={() => setActive(null)}
          onSaved={onRefresh}
        />
      )}
      {active?.type === "edit" && (
        <StockEtfEditPositionModal
          holding={holding}
          onClose={() => setActive(null)}
          onSaved={onRefresh}
        />
      )}
      {active?.type === "transactions" && (
        <StockEtfPositionHistoryModal
          holding={holding}
          mode="transactions"
          onClose={() => setActive(null)}
        />
      )}
      {active?.type === "adjustments" && (
        <StockEtfPositionHistoryModal
          holding={holding}
          mode="adjustments"
          onClose={() => setActive(null)}
        />
      )}
    </>
  );
}
