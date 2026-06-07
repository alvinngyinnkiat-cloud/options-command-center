"use client";

import { useState, useTransition } from "react";
import { refreshAutoWatchlistAction } from "@/app/actions/auto-watchlist";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDisplayDateTime } from "@/lib/format/datetime";
import type { AutoWatchlistPageData } from "@/lib/auto-watchlist/types";
import { RefreshCw } from "lucide-react";
import { AutoWatchlistCategoryPanel } from "./AutoWatchlistCategoryPanel";

interface AutoWatchlistClientProps {
  initialData: AutoWatchlistPageData;
}

export function AutoWatchlistClient({ initialData }: AutoWatchlistClientProps) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    setError(null);
    startTransition(async () => {
      const result = await refreshAutoWatchlistAction();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setData(result.data);
    });
  }

  function handleAdded() {
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auto Watchlist"
        description="Discovery screener by market cap and 1-year performance — separate from your manual options watchlist"
        actions={
          <>
            <Badge
              variant={data.dataSource === "supabase" ? "success" : "outline"}
            >
              {data.dataSource === "supabase" ? "Live data" : "Mock data"}
            </Badge>
            <Badge variant="outline">
              Market: {data.marketDataSource === "api" ? "API" : "Mock"}
            </Badge>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRefresh}
              disabled={isPending}
            >
              <RefreshCw
                className={cnIcon(isPending)}
              />
              {isPending ? "Refreshing…" : "Refresh Auto Watchlist"}
            </Button>
          </>
        }
      />

      <div className="rounded-lg border border-terminal-border bg-terminal-elevated/40 px-4 py-3 text-xs text-terminal-muted">
        Auto-generated discovery lists · Does not replace Watchlist Scanner ·
        Support/resistance is manual only when you add tickers to your main
        watchlist · No auto S/R generation
      </div>

      {data.generatedAt && (
        <p className="text-[11px] text-terminal-muted">
          Last generated: {formatDisplayDateTime(data.generatedAt)}
        </p>
      )}

      {error && <p className="text-xs text-loss">{error}</p>}

      <div className="space-y-6">
        {data.categories.map((category) => (
          <AutoWatchlistCategoryPanel
            key={category.id}
            category={category}
            manualWatchlistTickers={data.manualWatchlistTickers}
            onAdded={handleAdded}
          />
        ))}
      </div>

      <p className="text-[11px] text-terminal-muted">
        Green = positive 1-year performance · Red = negative · Add moves ticker
        into Watchlist Scanner for manual S/R and options analysis
      </p>
    </div>
  );
}

function cnIcon(spin: boolean): string {
  return spin ? "h-4 w-4 animate-spin" : "h-4 w-4";
}
