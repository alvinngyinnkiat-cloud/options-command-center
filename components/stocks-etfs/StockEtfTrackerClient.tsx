"use client";

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import type {
  EnrichedStockEtfHolding,
  StockEtfTrackerData,
} from "@/lib/stocks-etfs/types";
import { useDividendDataSync, type DividendDependentRefreshData } from "@/lib/dividends/use-dividend-sync";
import type { StockEtfTabId } from "./StockEtfCategoryTabs";
import { Plus } from "lucide-react";
import { StockEtfCategoryTabs } from "./StockEtfCategoryTabs";
import { StockEtfFormModal } from "./StockEtfFormModal";
import { SgStockTabPanel } from "./SgStockTabPanel";
import { UsEquitySummaryCards } from "./UsEquitySummaryCards";
import {
  HoldingsDisplayToggle,
  type HoldingsDisplayMode,
} from "./HoldingsDisplayToggle";
import { UsEquityHoldingsViews } from "./UsEquityHoldingsViews";

interface StockEtfTrackerClientProps {
  initialData: StockEtfTrackerData;
}

export function StockEtfTrackerClient({
  initialData,
}: StockEtfTrackerClientProps) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<StockEtfTabId>("us_etf");
  const [displayMode, setDisplayMode] =
    useState<HoldingsDisplayMode>("summary");
  const [formHolding, setFormHolding] = useState<
    EnrichedStockEtfHolding | null | undefined
  >(undefined);

  const handleDividendSync = useCallback((refresh: DividendDependentRefreshData) => {
    setData(refresh.stockData);
  }, []);
  useDividendDataSync(handleDividendSync);

  function handleRefresh() {
    window.location.reload();
  }

  const { tabs } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock & ETF Tracker"
        description="US ETF · US Stock · SG Stock — Summary, Detailed, or Card view"
        actions={
          <>
            <Badge
              variant={data.dataSource === "supabase" ? "success" : "outline"}
            >
              {data.dataSource === "supabase" ? "Live data" : "Mock data"}
            </Badge>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setFormHolding(null)}
            >
              <Plus className="h-4 w-4" />
              Add Holding
            </Button>
          </>
        }
      />

      <StockEtfCategoryTabs active={activeTab} onChange={setActiveTab} />

      <HoldingsDisplayToggle mode={displayMode} onChange={setDisplayMode} />

      {activeTab === "us_etf" && (
        <div className="space-y-4">
          <UsEquitySummaryCards
            title="US ETF"
            summary={tabs.usEtf.summary}
          />
          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
              US ETF Positions
            </h2>
            <UsEquityHoldingsViews
              rows={tabs.usEtf.rows}
              label="US ETF"
              mode={displayMode}
            />
          </section>
        </div>
      )}

      {activeTab === "us_stock" && (
        <div className="space-y-4">
          <UsEquitySummaryCards
            title="US Stock"
            summary={tabs.usStock.summary}
          />
          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
              US Stock Positions
            </h2>
            <UsEquityHoldingsViews
              rows={tabs.usStock.rows}
              label="US Stock"
              mode={displayMode}
            />
          </section>
        </div>
      )}

      {activeTab === "sg_stock" && (
        <SgStockTabPanel
          rows={tabs.sgStock.rows}
          summary={tabs.sgStock.summary}
          displayMode={displayMode}
        />
      )}

      {formHolding !== undefined && (
        <StockEtfFormModal
          holding={formHolding}
          onClose={() => setFormHolding(undefined)}
          onSaved={handleRefresh}
        />
      )}

      <p className="text-[11px] text-terminal-muted">
        Summary view fits without horizontal scroll · Detailed view shows all
        columns · My P/L only · Dividend income syncs from Dividend Tracker
      </p>
    </div>
  );
}
