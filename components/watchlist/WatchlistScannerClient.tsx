"use client";

import { useMemo, useState, useTransition } from "react";
import { refreshWatchlistScannerAction } from "@/app/actions/watchlist";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { sortRowsByWatchlistRank } from "@/lib/watchlist/watchlist-rank";
import {
  WATCHLIST_CATEGORIES,
  WATCHLIST_CATEGORY_LABELS,
  getCategoryLabel,
  type WatchlistCategory,
} from "@/lib/watchlist/categories";
import type { EnrichedAlert } from "@/lib/alerts/types";
import type { WatchlistScannerData } from "@/lib/watchlist/types";
import type { WeekendReviewStatus } from "@/lib/weekend-review/types";
import type { TradeReadinessResult } from "@/lib/trading-workflow/types";
import { WeekendMarketReviewPanel } from "@/components/weekend-review/WeekendMarketReviewPanel";
import { LayoutGrid, RefreshCw, ScanLine, Table2 } from "lucide-react";
import { AddTickerForm } from "./AddTickerForm";
import { StrategyRecommendationsPanel } from "./StrategyRecommendationsPanel";
import { TradingAnalysisPanel } from "./TradingAnalysisPanel";
import { TradingAnalysisScannerGrid } from "./TradingAnalysisScannerGrid";
import { WatchlistCategoryTable } from "./WatchlistCategoryTable";
import { WatchlistTable } from "./WatchlistTable";

type WatchlistViewMode = "categories" | "scanner" | "cards" | "table";

interface WatchlistScannerClientProps {
  initialData: WatchlistScannerData;
  reviewStatus: WeekendReviewStatus;
  alerts?: EnrichedAlert[];
  readinessByTicker?: Record<string, TradeReadinessResult>;
}

export function WatchlistScannerClient({
  initialData,
  reviewStatus,
  alerts = [],
  readinessByTicker = {},
}: WatchlistScannerClientProps) {
  const [rows, setRows] = useState(initialData.rows);
  const [dataSource, setDataSource] = useState(initialData.dataSource);
  const [activeCategory, setActiveCategory] =
    useState<WatchlistCategory>("ETF");
  const [viewMode, setViewMode] = useState<WatchlistViewMode>("categories");
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();

  const activeRows = useMemo(
    () => rows.filter((row) => row.isActive),
    [rows]
  );

  const rowsByCategory = useMemo(() => {
    const map = new Map<WatchlistCategory, number>();
    for (const category of WATCHLIST_CATEGORIES) {
      map.set(
        category,
        activeRows.filter((row) => row.category === category).length
      );
    }
    return map;
  }, [activeRows]);

  const tickersByCategory = useMemo(() => {
    const map = new Map<WatchlistCategory, string[]>();
    for (const category of WATCHLIST_CATEGORIES) {
      map.set(
        category,
        sortRowsByWatchlistRank(
          activeRows.filter((row) => row.category === category)
        ).map((row) => row.ticker)
      );
    }
    return map;
  }, [activeRows]);

  function handleRowsChange(
    updated: typeof rows,
    source: "supabase" | "mock"
  ) {
    setRows(updated);
    setDataSource(source);
  }

  const categoryRows = useMemo(
    () =>
      sortRowsByWatchlistRank(
        activeRows.filter((row) => row.category === activeCategory)
      ),
    [activeRows, activeCategory]
  );

  function handleRefresh() {
    setRefreshError(null);
    startRefresh(async () => {
      const result = await refreshWatchlistScannerAction();
      if (!result.success) {
        setRefreshError(result.error);
        return;
      }
      handleRowsChange(result.rows, result.dataSource);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Watchlist Scanner"
        description={`${activeRows.length} Active Tickers · Saved Supabase data · Use Refresh to pull latest market data`}
        actions={
          <>
            <Badge variant={dataSource === "supabase" ? "success" : "outline"}>
              {dataSource === "supabase" ? "Live data" : "Mock data"}
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={isRefreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              />
              {isRefreshing ? "Refreshing…" : "Refresh Data"}
            </Button>
          </>
        }
      />

      {refreshError && (
        <p className="text-xs text-loss">{refreshError}</p>
      )}

      <WeekendMarketReviewPanel
        initialStatus={reviewStatus}
        onReviewComplete={(_result, updatedRows) => {
          handleRowsChange(updatedRows, _result.dataSource);
        }}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {WATCHLIST_CATEGORIES.map((category) => (
          <div
            key={category}
            className="rounded-lg border border-terminal-border bg-terminal-elevated/30 px-3 py-2"
          >
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              {WATCHLIST_CATEGORY_LABELS[category]}
            </p>
            <p className="mt-1 text-xs font-mono text-terminal-muted leading-relaxed">
              {(tickersByCategory.get(category) ?? []).join(" · ") || "—"}
            </p>
            <p className="mt-1 text-[11px] text-terminal-muted">
              {rowsByCategory.get(category) ?? 0} active
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4">
        <AddTickerForm category={activeCategory} onAdded={handleRowsChange} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-terminal-border p-1">
          {WATCHLIST_CATEGORIES.map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? "primary" : "ghost"}
              size="sm"
              onClick={() => {
                setActiveCategory(category);
                setViewMode("categories");
              }}
            >
              {getCategoryLabel(category)}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-terminal-border p-1">
          <Button
            variant={viewMode === "categories" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("categories")}
          >
            Category View
          </Button>
          <Button
            variant={viewMode === "scanner" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("scanner")}
          >
            <ScanLine className="h-4 w-4" />
            Analysis Grid
          </Button>
          <Button
            variant={viewMode === "cards" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("cards")}
          >
            <LayoutGrid className="h-4 w-4" />
            Detail Cards
          </Button>
          <Button
            variant={viewMode === "table" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            <Table2 className="h-4 w-4" />
            Full Table
          </Button>
        </div>
      </div>

      {viewMode === "categories" && (
        <WatchlistCategoryTable
          category={activeCategory}
          rows={activeRows}
          reviewStatus={reviewStatus}
          alerts={alerts}
          readinessByTicker={readinessByTicker}
          allowRemove
          onRowsChange={handleRowsChange}
          dataSource={dataSource}
        />
      )}

      {viewMode === "scanner" && (
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
            Trading Analysis Scanner — {getCategoryLabel(activeCategory)}
          </h2>
          <TradingAnalysisScannerGrid
            rows={categoryRows}
            reviewStatus={reviewStatus}
            alerts={alerts}
            readinessByTicker={readinessByTicker}
            emptyMessage={`No tickers in ${getCategoryLabel(activeCategory)}.`}
          />
          <p className="mt-2 text-[11px] text-terminal-muted">
            Quick trade overview · Ticker · Strategy · Action only · Click a row
            for full score breakdown
          </p>
        </div>
      )}

      {viewMode === "cards" && (
        <TradingAnalysisPanel
          rows={categoryRows}
          reviewStatus={reviewStatus}
        />
      )}

      {viewMode === "table" && (
        <>
          <WatchlistTable
            rows={categoryRows}
            dataSource={dataSource}
            onRowsChange={handleRowsChange}
          />
          <StrategyRecommendationsPanel rows={categoryRows} />
        </>
      )}
    </div>
  );
}
