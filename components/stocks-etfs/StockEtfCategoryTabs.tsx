"use client";

import { cn } from "@/lib/utils";
import type { MarketCategory } from "@/lib/stocks-etfs/market-category";

export type StockEtfTabId = MarketCategory;

const TABS: { id: StockEtfTabId; label: string }[] = [
  { id: "us_etf", label: "US ETF" },
  { id: "us_stock", label: "US Stock" },
  { id: "sg_stock", label: "SG Stock" },
];

interface StockEtfCategoryTabsProps {
  active: StockEtfTabId;
  onChange: (tab: StockEtfTabId) => void;
}

export function StockEtfCategoryTabs({
  active,
  onChange,
}: StockEtfCategoryTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-terminal-border pb-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            active === tab.id
              ? "bg-accent text-white"
              : "text-terminal-muted hover:bg-terminal-elevated hover:text-terminal-text"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export { TABS as STOCK_ETF_TABS };
