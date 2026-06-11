"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { EnrichedStockEtfHolding } from "@/lib/stocks-etfs/types";
import { MoreHorizontal } from "lucide-react";
import { StockEtfBuySellModal } from "./StockEtfBuySellModal";
import { StockEtfEditPositionModal } from "./StockEtfEditPositionModal";
import { StockEtfPositionHistoryModal } from "./StockEtfPositionHistoryModal";
import { StockEtfDeletePositionModal } from "./StockEtfDeletePositionModal";

type ActiveModal =
  | { type: "buy" }
  | { type: "sell" }
  | { type: "edit" }
  | { type: "transactions" }
  | { type: "adjustments" }
  | { type: "delete" }
  | null;

interface StockEtfPositionActionsMenuProps {
  holding: EnrichedStockEtfHolding;
  onRefresh: () => void;
}

const MENU_ITEMS = [
  { type: "buy" as const, label: "Add Buy" },
  { type: "sell" as const, label: "Add Sell" },
  { type: "edit" as const, label: "Edit Position" },
  { type: "transactions" as const, label: "View Transactions" },
  { type: "adjustments" as const, label: "View Adjustment History" },
  { type: "delete" as const, label: "Delete Position" },
];

export function StockEtfPositionActionsMenu({
  holding,
  onRefresh,
}: StockEtfPositionActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ActiveModal>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function selectAction(type: NonNullable<ActiveModal>["type"]) {
    setOpen(false);
    setActive({ type });
  }

  return (
    <>
      <div className="relative inline-block" ref={ref}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          aria-label="Position actions"
          onClick={() => setOpen((value) => !value)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
        {open && (
          <div className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-md border border-terminal-border bg-terminal-bg py-1 shadow-lg">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.type}
                type="button"
                className="block w-full px-3 py-1.5 text-left text-xs text-terminal-text hover:bg-terminal-elevated/60"
                onClick={() => selectAction(item.type)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
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
      {active?.type === "delete" && (
        <StockEtfDeletePositionModal
          holding={holding}
          onClose={() => setActive(null)}
          onDeleted={onRefresh}
        />
      )}
    </>
  );
}
