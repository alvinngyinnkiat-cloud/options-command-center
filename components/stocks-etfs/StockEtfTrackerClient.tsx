"use client";

import { useCallback, useState, useTransition } from "react";
import { refreshStockMarketPricesAction } from "@/app/actions/stock-etf";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import type {
  EnrichedStockEtfHolding,
  StockEtfTrackerData,
} from "@/lib/stocks-etfs/types";
import { useDividendDataSync, type DividendDependentRefreshData } from "@/lib/dividends/use-dividend-sync";
import type { StockEtfTabId } from "./StockEtfCategoryTabs";
import { Plus, RefreshCw } from "lucide-react";
import { StockEtfCategoryTabs } from "./StockEtfCategoryTabs";
import { StockEtfFormModal } from "./StockEtfFormModal";
import { SgStockTabPanel } from "./SgStockTabPanel";
import { UsEquitySummaryCards } from "./UsEquitySummaryCards";
import { UsEquityHoldingsViews } from "./UsEquityHoldingsViews";

interface StockEtfTrackerClientProps {
  initialData: StockEtfTrackerData;
}

export function StockEtfTrackerClient({
  initialData,
}: StockEtfTrackerClientProps) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<StockEtfTabId>("us_etf");
  const [priceError, setPriceError] = useState<string | null>(null);
  const [isPricePending, startPriceTransition] = useTransition();
  const [formHolding, setFormHolding] = useState<
    EnrichedStockEtfHolding | null | undefined
  >(undefined);

  const handleDividendSync = useCallback((refresh: DividendDependentRefreshData) => {
    setData(refresh.stockData);
  }, []);
  useDividendDataSync(handleDividendSync);

  function handleRefreshPrices() {
    setPriceError(null);
    startPriceTransition(async () => {
      const result = await refreshStockMarketPricesAction();
      if (!result.success) {
        setPriceError(result.error);
        return;
      }
      setData(result.data);
    });
  }

  function handleRefresh() {
    window.location.reload();
  }

  const { tabs } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock & ETF Tracker"
        description="US ETF · US Stock · SG Stock — position ownership, capital, dividends, and ROI"
        actions={
          <>
            <Badge
              variant={data.dataSource === "supabase" ? "success" : "outline"}
            >
              {data.dataSource === "supabase" ? "Live data" : "Mock data"}
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefreshPrices}
              disabled={isPricePending}
            >
              <RefreshCw
                className={`h-4 w-4 ${isPricePending ? "animate-spin" : ""}`}
              />
              {isPricePending ? "Updating…" : "Refresh Prices"}
            </Button>
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

      {priceError && (
        <p className="text-xs text-loss">{priceError}</p>
      )}

      <StockEtfCategoryTabs active={activeTab} onChange={setActiveTab} />

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
              onRefresh={handleRefresh}
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
              onRefresh={handleRefresh}
            />
          </section>
        </div>
      )}

      {activeTab === "sg_stock" && (
        <SgStockTabPanel
          rows={tabs.sgStock.rows}
          summary={tabs.sgStock.summary}
          onRefresh={handleRefresh}
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
        Stock and ETF holdings only — options premium and combined performance
        live in Options Trade Tracker and Portfolio Income &amp; Position Manager.
        Dividend income syncs from Dividend Tracker.
      </p>
    </div>
  );
}
