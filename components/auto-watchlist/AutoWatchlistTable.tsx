"use client";

import { useState, useTransition } from "react";
import { addToManualWatchlistAction } from "@/app/actions/auto-watchlist";
import { Button } from "@/components/ui/Button";
import {
  formatMarketCapBillions,
  formatPerformancePct,
  formatPrice,
} from "@/lib/auto-watchlist/format";
import type { AutoWatchlistEntry } from "@/lib/auto-watchlist/types";
import { cn } from "@/lib/utils";
import { ListPlus, Loader2 } from "lucide-react";

interface AutoWatchlistTableProps {
  entries: AutoWatchlistEntry[];
  manualWatchlistTickers: string[];
  onAdded: () => void;
}

export function AutoWatchlistTable({
  entries,
  manualWatchlistTickers,
  onAdded,
}: AutoWatchlistTableProps) {
  const [addingTicker, setAddingTicker] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleAdd(ticker: string) {
    setAddingTicker(ticker);
    startTransition(async () => {
      await addToManualWatchlistAction(ticker);
      setAddingTicker(null);
      onAdded();
    });
  }

  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-terminal-border px-4 py-6 text-center text-xs text-terminal-muted">
        No tickers match this screen right now.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[1100px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/60 text-left uppercase tracking-wider text-terminal-muted">
            <th className="px-2 py-2 font-medium">#</th>
            <th className="px-2 py-2 font-medium">Ticker</th>
            <th className="px-2 py-2 font-medium">Company</th>
            <th className="px-2 py-2 font-medium text-right">Mkt Cap</th>
            <th className="px-2 py-2 font-medium">Sector</th>
            <th className="px-2 py-2 font-medium text-right">Price</th>
            <th className="px-2 py-2 font-medium text-right">1Y %</th>
            <th className="px-2 py-2 font-medium text-right">52W High</th>
            <th className="px-2 py-2 font-medium text-right">52W Low</th>
            <th className="px-2 py-2 font-medium text-right">From High</th>
            <th className="px-2 py-2 font-medium text-right">From Low</th>
            <th className="px-2 py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((row) => {
            const onWatchlist = manualWatchlistTickers.includes(row.ticker);
            const perfPositive = row.oneYearPerformancePercent >= 0;
            return (
              <tr
                key={row.id}
                className="border-b border-terminal-border/40 hover:bg-terminal-elevated/30"
              >
                <td className="px-2 py-2 font-mono text-terminal-muted">
                  {row.rank}
                </td>
                <td className="px-2 py-2 font-mono font-semibold text-accent">
                  {row.ticker}
                </td>
                <td className="max-w-[140px] truncate px-2 py-2 text-terminal-text">
                  {row.companyName}
                </td>
                <td className="px-2 py-2 font-mono text-right text-terminal-text">
                  {formatMarketCapBillions(row.marketCapBillions)}
                </td>
                <td className="px-2 py-2 text-terminal-muted">{row.sector}</td>
                <td className="px-2 py-2 font-mono text-right">
                  {formatPrice(row.currentPrice)}
                </td>
                <td
                  className={cn(
                    "px-2 py-2 font-mono text-right font-medium",
                    perfPositive ? "text-profit" : "text-loss"
                  )}
                >
                  {formatPerformancePct(row.oneYearPerformancePercent)}
                </td>
                <td className="px-2 py-2 font-mono text-right text-terminal-muted">
                  {formatPrice(row.fiftyTwoWeekHigh)}
                </td>
                <td className="px-2 py-2 font-mono text-right text-terminal-muted">
                  {formatPrice(row.fiftyTwoWeekLow)}
                </td>
                <td className="px-2 py-2 font-mono text-right text-loss">
                  {formatPerformancePct(row.distanceFromHighPercent)}
                </td>
                <td className="px-2 py-2 font-mono text-right text-profit">
                  {formatPerformancePct(row.distanceFromLowPercent)}
                </td>
                <td className="px-2 py-2">
                  <Button
                    variant={onWatchlist ? "ghost" : "secondary"}
                    size="sm"
                    disabled={onWatchlist || addingTicker === row.ticker}
                    onClick={() => handleAdd(row.ticker)}
                    title={
                      onWatchlist
                        ? "Already on manual watchlist"
                        : "Add to Watchlist Scanner"
                    }
                  >
                    {addingTicker === row.ticker ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ListPlus className="h-3.5 w-3.5" />
                    )}
                    {onWatchlist ? "On List" : "Add"}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
