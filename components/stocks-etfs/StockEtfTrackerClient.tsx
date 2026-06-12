"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { refreshStockMarketPricesAction } from "@/app/actions/stock-etf";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import type { StockEtfTrackerData } from "@/lib/stocks-etfs/types";
import type { StockEtfTabId } from "./StockEtfCategoryTabs";
import { useDividendDataSync, type DividendDependentRefreshData } from "@/lib/dividends/use-dividend-sync";
import { Banknote, RefreshCw, ShoppingCart, SlidersHorizontal, TrendingDown } from "lucide-react";
import { StockEtfCategoryTabs } from "./StockEtfCategoryTabs";
import { StockEtfTransactionHistoryTable } from "./StockEtfTransactionHistoryTable";
import {
  StockEtfTransactionModals,
  type StockEtfModalKind,
} from "./StockEtfTransactionModals";
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
  const [txModal, setTxModal] = useState<StockEtfModalKind | null>(null);

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

  const allHoldings = useMemo(() => {
    const fromUs = [...tabs.usEtf.rows, ...tabs.usStock.rows]
      .map((row) => row.holding)
      .filter((holding): holding is NonNullable<typeof holding> => holding != null);
    const fromSg = tabs.sgStock.rows.map((row) => row.holding);
    return [...fromUs, ...fromSg];
  }, [tabs]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock & ETF Tracker"
        description="Record buys and sells to build position history — past and future. Use Manual Adjustment only for corrections."
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
              onClick={() => setTxModal("buy")}
            >
              <ShoppingCart className="h-4 w-4" />
              Buy
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setTxModal("sell")}
            >
              <TrendingDown className="h-4 w-4" />
              Sell
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setTxModal("dividend")}
            >
              <Banknote className="h-4 w-4" />
              Dividend
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setTxModal("adjustment")}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Manual Adjustment
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
          <UsEquitySummaryCards title="US ETF" summary={tabs.usEtf.summary} />
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
          <UsEquitySummaryCards title="US Stock" summary={tabs.usStock.summary} />
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

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Transaction History
        </h2>
        <StockEtfTransactionHistoryTable transactions={data.transactions} />
      </section>

      <StockEtfTransactionModals
        kind={txModal}
        defaultMarketCategory={activeTab}
        holdings={allHoldings}
        onClose={() => setTxModal(null)}
        onSaved={handleRefresh}
      />

      <p className="text-[11px] text-terminal-muted">
        Record buys, sells, and dividends via the action buttons above. Use
        Manual Adjustment only to correct position summary values.
      </p>
    </div>
  );
}
