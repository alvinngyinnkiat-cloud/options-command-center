"use client";

import { useEffect, useRef, useState } from "react";
import { migrateStockEtfHoldingToTransactionMode } from "@/app/actions/stock-etf";
import { Button } from "@/components/ui/Button";
import type { EnrichedStockEtfHolding } from "@/lib/stocks-etfs/types";
import { MoreHorizontal } from "lucide-react";
import { StockEtfBuySellModal } from "./StockEtfBuySellModal";
import { StockEtfEditPositionModal } from "./StockEtfEditPositionModal";
import { StockEtfFormModal } from "./StockEtfFormModal";
import { StockEtfPositionHistoryModal } from "./StockEtfPositionHistoryModal";
import { StockEtfDeletePositionModal } from "./StockEtfDeletePositionModal";

type ActiveModal =
  | { type: "buy" }
  | { type: "sell" }
  | { type: "edit" }
  | { type: "manualEdit" }
  | { type: "transactions" }
  | { type: "adjustments" }
  | { type: "delete" }
  | null;

interface StockEtfPositionActionsMenuProps {
  holding: EnrichedStockEtfHolding;
  onRefresh: () => void;
}

export function StockEtfPositionActionsMenu({
  holding,
  onRefresh,
}: StockEtfPositionActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ActiveModal>(null);
  const [migrating, setMigrating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isManual = holding.trackingMode === "manual";

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

  async function handleMigrate() {
    setOpen(false);
    if (
      !confirm(
        `Switch ${holding.ticker} to Transaction Accounting? An opening balance transaction will be created from the current manual snapshot.`
      )
    ) {
      return;
    }
    setMigrating(true);
    const result = await migrateStockEtfHoldingToTransactionMode(holding.id);
    setMigrating(false);
    if (!result.success) {
      alert(result.error);
      return;
    }
    if (result.ledgerWarning) {
      alert(result.ledgerWarning);
    }
    onRefresh();
  }

  const menuItems = isManual
    ? [
        { type: "manualEdit" as const, label: "Edit Position" },
        { type: "migrate" as const, label: "Switch to Transaction Mode" },
        { type: "delete" as const, label: "Delete Position" },
      ]
    : [
        { type: "buy" as const, label: "Add Buy" },
        { type: "sell" as const, label: "Add Sell" },
        { type: "edit" as const, label: "Edit Position" },
        { type: "transactions" as const, label: "View Transactions" },
        { type: "adjustments" as const, label: "View Adjustment History" },
        { type: "delete" as const, label: "Delete Position" },
      ];

  return (
    <>
      <div className="relative inline-block" ref={ref}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          aria-label="Position actions"
          disabled={migrating}
          onClick={() => setOpen((value) => !value)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
        {open && (
          <div className="absolute right-0 z-20 mt-1 min-w-[12rem] rounded-md border border-terminal-border bg-terminal-bg py-1 shadow-lg">
            {menuItems.map((item) =>
              item.type === "migrate" ? (
                <button
                  key={item.type}
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-xs text-terminal-text hover:bg-terminal-elevated/60"
                  onClick={handleMigrate}
                >
                  {item.label}
                </button>
              ) : (
                <button
                  key={item.type}
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-xs text-terminal-text hover:bg-terminal-elevated/60"
                  onClick={() => selectAction(item.type)}
                >
                  {item.label}
                </button>
              )
            )}
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
      {active?.type === "manualEdit" && (
        <StockEtfFormModal
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
