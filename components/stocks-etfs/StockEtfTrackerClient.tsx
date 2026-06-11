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
import type { StockEtfTabId } from "./StockEtfCategoryTabs";
import { useDividendDataSync, type DividendDependentRefreshData } from "@/lib/dividends/use-dividend-sync";
import { Plus, RefreshCw, ShoppingCart } from "lucide-react";
import { StockEtfCategoryTabs } from "./StockEtfCategoryTabs";
import { StockEtfFormModal } from "./StockEtfFormModal";
import { StockEtfTrackingModeToggle } from "./StockEtfTrackingModeToggle";
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
  const [formHolding, setFormHolding] = useState<
    EnrichedStockEtfHolding | null | undefined
  >(undefined);
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
  const isTransactionMode = data.trackingModeDefault === "transaction";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock & ETF Tracker"
        description={
          isTransactionMode
            ? "Transaction Accounting — buy, sell, and dividend history"
            : "Manual Position mode — backfill historical snapshots without transaction history"
        }
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
            {isTransactionMode && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTxModal("buy")}
              >
                <ShoppingCart className="h-4 w-4" />
                Buy
              </Button>
            )}
            {!isTransactionMode && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setFormHolding(null)}
              >
                <Plus className="h-4 w-4" />
                Add Position
              </Button>
            )}
          </>
        }
      />

      {priceError && (
        <p className="text-xs text-loss">{priceError}</p>
      )}

      <StockEtfTrackingModeToggle data={data} onDataChange={setData} />

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

      {isTransactionMode ? (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
            Transaction History
          </h2>
          <StockEtfTransactionHistoryTable
            ledger={data.ledger}
            onRefresh={handleRefresh}
          />
        </section>
      ) : (
        <p className="rounded-lg border border-dashed border-terminal-border px-4 py-3 text-[11px] text-terminal-muted">
          Transaction history and ledger are available in Transaction Accounting
          mode. Manual positions do not require buy/sell history or the ledger
          table.
        </p>
      )}

      {formHolding !== undefined && (
        <StockEtfFormModal
          holding={formHolding}
          onClose={() => setFormHolding(undefined)}
          onSaved={handleRefresh}
        />
      )}

      <StockEtfTransactionModals
        kind={txModal}
        defaultMarketCategory={activeTab}
        onClose={() => setTxModal(null)}
        onSaved={handleRefresh}
      />

      <p className="text-[11px] text-terminal-muted">
        {isTransactionMode
          ? "Transaction Accounting tracks buys, sells, and dividends. Trading Cash remains on the Portfolio Dashboard."
          : "Manual Position mode stores snapshot totals only. Switch individual positions to Transaction Accounting when ready for full history."}
      </p>
    </div>
  );
}
