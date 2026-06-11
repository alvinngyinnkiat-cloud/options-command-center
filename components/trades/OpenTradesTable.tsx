"use client";

import { AlertWarningIcon } from "@/components/alerts/AlertWarningIcon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PnlPercentValue, PnlValue } from "@/components/ui/PnlValue";
import { filterAlertsByTicker } from "@/lib/alerts/summary";
import type { EnrichedAlert } from "@/lib/alerts/types";
import { DTE_URGENT_THRESHOLD } from "@/lib/trades/constants";
import {
  formatBreakevenDistanceDollars,
  formatBreakevenDistancePctDisplay,
  formatUnderlyingPriceDisplay,
  getBreakevenSafetyTone,
  UNDERLYING_PRICE_UNAVAILABLE,
} from "@/lib/trades/breakeven-safety";
import {
  formatUnderlyingPriceSourceLabel,
} from "@/lib/trades/underlying-price-types";
import {
  formatClientAllocation,
  formatCurrency,
  formatCurrentOptionValueDisplay,
  formatLongStrike,
  formatOptionValuePerContract,
  formatShortStrike,
  CURRENT_OPTION_VALUE_NOT_UPDATED,
} from "@/lib/trades/format";
import {
  formatDteLabel,
  getDteReviewLabel,
  getDteTone,
  MISSING_DTE_LABEL,
  resolveTradeDte,
} from "@/lib/trades/dte-display";
import {
  sortTrades,
  toggleTradeSort,
  type TradeSortColumn,
  type TradeSortState,
} from "@/lib/trades/sort-trades";
import type { EnrichedTrade, TradeTrackerViewMode } from "@/lib/trades/types";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Pencil, RefreshCw } from "lucide-react";
import { useMemo } from "react";

interface OpenTradesTableProps {
  trades: EnrichedTrade[];
  viewMode: TradeTrackerViewMode;
  onSelect: (trade: EnrichedTrade) => void;
  onEdit: (trade: EnrichedTrade) => void;
  onEditValue: (trade: EnrichedTrade) => void;
  showAll?: boolean;
  alerts?: EnrichedAlert[];
  showRefreshPrice?: boolean;
  onRefreshPrice?: () => void;
  refreshPriceBusy?: boolean;
  sortState: TradeSortState;
  onSortChange: (sort: TradeSortState) => void;
}

function statusVariant(status: string) {
  switch (status) {
    case "open":
      return "success" as const;
    case "managed":
      return "info" as const;
    case "rolled":
      return "warning" as const;
    case "closed":
      return "outline" as const;
    default:
      return "default" as const;
  }
}

function filterDisplayTrades(trades: EnrichedTrade[], showAll: boolean) {
  return showAll
    ? trades
    : trades.filter(
        (t) =>
          t.status === "open" ||
          t.status === "managed" ||
          t.status === "closing"
      );
}

function SortableTh({
  column,
  label,
  sortState,
  onSort,
  align = "left",
  className,
}: {
  column: TradeSortColumn;
  label: string;
  sortState: TradeSortState;
  onSort: (column: TradeSortColumn) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sortState.column === column;
  return (
    <th
      className={cn(
        "px-1.5 py-2 font-medium sm:px-2",
        align === "right" && "text-right",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-0.5 uppercase tracking-wider transition-colors hover:text-terminal-text",
          align === "right" && "ml-auto",
          active ? "text-terminal-text" : "text-terminal-muted"
        )}
      >
        {label}
        {active &&
          (sortState.direction === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          ))}
      </button>
    </th>
  );
}

function SortableThDetailed({
  column,
  label,
  sortState,
  onSort,
  align = "left",
  className,
}: {
  column: TradeSortColumn;
  label: string;
  sortState: TradeSortState;
  onSort: (column: TradeSortColumn) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sortState.column === column;
  return (
    <th
      className={cn(
        "px-3 py-2.5 font-medium",
        align === "right" && "text-right",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-0.5 uppercase tracking-wider transition-colors hover:text-terminal-text",
          align === "right" && "ml-auto",
          active ? "text-terminal-text" : "text-terminal-muted"
        )}
      >
        {label}
        {active &&
          (sortState.direction === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          ))}
      </button>
    </th>
  );
}

function handleSortClick(
  column: TradeSortColumn,
  sortState: TradeSortState,
  onSortChange: (sort: TradeSortState) => void
) {
  onSortChange(toggleTradeSort(sortState, column));
}

function TickerCell({
  trade,
  alerts,
}: {
  trade: EnrichedTrade;
  alerts: EnrichedAlert[];
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <AlertWarningIcon alerts={filterAlertsByTicker(alerts, trade.ticker)} />
      <span className="font-mono font-semibold text-terminal-text">
        {trade.ticker}
      </span>
    </span>
  );
}

function PnlCell({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return <PnlValue value={value} className={cn("font-medium", className)} />;
}

function PnlPctCell({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return <PnlPercentValue value={value} className={className} />;
}

function StatusBadge({ trade }: { trade: EnrichedTrade }) {
  return (
    <Badge
      variant={statusVariant(trade.status)}
      className="text-[10px] uppercase"
    >
      {trade.statusLabel}
    </Badge>
  );
}

function DteCell({ expirationDate }: { expirationDate: string }) {
  const dte = resolveTradeDte(expirationDate);
  if (dte == null) {
    return (
      <span className="text-[10px] font-medium text-terminal-muted">
        {MISSING_DTE_LABEL}
      </span>
    );
  }
  const tone = getDteTone(dte);

  return (
    <span
      className={cn(
        "font-mono font-semibold",
        tone === "comfort" && "text-profit",
        tone === "caution" && "text-warning",
        tone === "danger" && "text-loss"
      )}
    >
      {formatDteLabel(dte)}
    </span>
  );
}

function BreakevenSafetyPctCell({ trade }: { trade: EnrichedTrade }) {
  const calc = trade.calculations;
  const tone = getBreakevenSafetyTone(calc.breakevenSafetyStatus);
  const label = formatBreakevenDistancePctDisplay({
    underlyingPrice: trade.underlyingPriceUsable
      ? trade.underlyingCurrentPrice
      : null,
    distancePct: calc.breakevenSafetyDistancePct,
    putDistancePct: calc.breakevenPutDistancePct,
    callDistancePct: calc.breakevenCallDistancePct,
    isIronCondor: trade.strategy === "iron_condor",
  });

  return (
    <span
      className={cn(
        "font-mono font-medium",
        !trade.underlyingPriceUsable && "text-terminal-muted text-[10px]",
        trade.underlyingPriceUsable && tone === "safe" && "text-profit",
        trade.underlyingPriceUsable && tone === "caution" && "text-warning",
        trade.underlyingPriceUsable && tone === "danger" && "text-loss",
        trade.underlyingPriceUsable && tone === "muted" && "text-terminal-muted"
      )}
    >
      {label}
    </span>
  );
}

function UnderlyingPriceMeta({ trade }: { trade: EnrichedTrade }) {
  return (
    <span className="block truncate text-[9px] text-terminal-muted">
      {formatUnderlyingPriceSourceLabel(trade.underlyingPriceSource)}
      {trade.underlyingPriceUpdatedAt
        ? ` · ${trade.underlyingPriceUpdatedAt.slice(0, 10)}`
        : ""}
    </span>
  );
}

function UnderlyingPriceCell({
  trade,
  showRefresh,
  onRefresh,
  refreshBusy,
}: {
  trade: EnrichedTrade;
  showRefresh?: boolean;
  onRefresh?: () => void;
  refreshBusy?: boolean;
}) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center justify-end gap-1">
        <span
          className={cn(
            "font-mono",
            !trade.underlyingPriceUsable
              ? "text-[10px] text-terminal-muted"
              : "text-terminal-text"
          )}
        >
          {formatUnderlyingPriceDisplay(
            trade.underlyingPriceUsable ? trade.underlyingCurrentPrice : null
          )}
        </span>
        {showRefresh && onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={refreshBusy}
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            aria-label={`Refresh underlying price for ${trade.ticker}`}
            title="Refresh underlying price"
          >
            <RefreshCw
              className={cn("h-3 w-3", refreshBusy && "animate-spin")}
            />
          </Button>
        )}
      </div>
      <UnderlyingPriceMeta trade={trade} />
    </div>
  );
}

function isOpenTrade(trade: EnrichedTrade) {
  return trade.status !== "closed";
}

function BreakevenStatusBadge({ trade }: { trade: EnrichedTrade }) {
  if (!trade.underlyingPriceUsable) {
    return (
      <span className="text-[10px] text-terminal-muted">
        {UNDERLYING_PRICE_UNAVAILABLE}
      </span>
    );
  }

  const status = trade.calculations.breakevenSafetyStatus;
  if (!status) {
    return <span className="text-terminal-muted">—</span>;
  }

  const tone = getBreakevenSafetyTone(status);
  const variant =
    tone === "safe"
      ? "success"
      : tone === "caution"
        ? "warning"
        : tone === "danger"
          ? "danger"
          : "outline";

  return (
    <Badge variant={variant} className="text-[10px] uppercase">
      {status}
    </Badge>
  );
}

function TradeStatusCell({ trade }: { trade: EnrichedTrade }) {
  const dte = resolveTradeDte(trade.expirationDate);
  const reviewLabel = dte != null ? getDteReviewLabel(dte) : null;

  return (
    <div className="flex flex-col items-start gap-0.5">
      {trade.calculations.takeProfitReached ? (
        <Badge variant="success" className="text-[10px] uppercase">
          TP HIT
        </Badge>
      ) : (
        <StatusBadge trade={trade} />
      )}
      {reviewLabel && dte != null && (
        <span
          className={cn(
            "text-[9px] font-semibold uppercase leading-tight",
            dte < DTE_URGENT_THRESHOLD ? "text-loss" : "text-warning"
          )}
        >
          {reviewLabel}
        </span>
      )}
    </div>
  );
}

function TakeProfitPriceCell({ trade }: { trade: EnrichedTrade }) {
  return (
    <span className="font-mono text-terminal-text">
      {formatOptionValuePerContract(trade.calculations.takeProfitClosePrice)}
    </span>
  );
}

function CurrentOptionValueCell({ trade }: { trade: EnrichedTrade }) {
  return (
    <span
      className={cn(
        "font-mono",
        trade.manualCurrentOptionValue == null
          ? "text-[10px] text-terminal-muted"
          : "text-terminal-text"
      )}
    >
      {formatCurrentOptionValueDisplay(trade.manualCurrentOptionValue)}
    </span>
  );
}

function OpenTradePnlCell({ trade, value }: { trade: EnrichedTrade; value: number }) {
  if (trade.status !== "closed" && trade.manualCurrentOptionValue == null) {
    return (
      <span className="text-[10px] text-terminal-muted">
        {CURRENT_OPTION_VALUE_NOT_UPDATED}
      </span>
    );
  }
  return <PnlCell value={value} />;
}

function OpenTradePnlPctCell({
  trade,
  value,
}: {
  trade: EnrichedTrade;
  value: number;
}) {
  if (trade.status !== "closed" && trade.manualCurrentOptionValue == null) {
    return (
      <span className="text-[10px] text-terminal-muted">
        {CURRENT_OPTION_VALUE_NOT_UPDATED}
      </span>
    );
  }
  return <PnlPctCell value={value} />;
}

function SummaryTable({
  rows,
  alerts,
  onSelect,
  onEditValue,
  sortState,
  onSortChange,
}: {
  rows: EnrichedTrade[];
  alerts: EnrichedAlert[];
  onSelect: (trade: EnrichedTrade) => void;
  onEditValue: (trade: EnrichedTrade) => void;
  sortState: TradeSortState;
  onSortChange: (sort: TradeSortState) => void;
}) {
  const onSort = (column: TradeSortColumn) =>
    handleSortClick(column, sortState, onSortChange);

  return (
    <div className="rounded-lg border border-terminal-border">
      <table className="w-full table-fixed text-[11px] sm:text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
            <SortableTh
              column="underlying"
              label="Underlying"
              sortState={sortState}
              onSort={onSort}
              className="w-[12%]"
            />
            <SortableTh
              column="strategy"
              label="Strategy"
              sortState={sortState}
              onSort={onSort}
              className="w-[10%]"
            />
            <SortableTh
              column="dte"
              label="DTE"
              sortState={sortState}
              onSort={onSort}
              align="right"
              className="w-[8%]"
            />
            <th className="w-[13%] px-1.5 py-2 font-medium text-right sm:px-2">
              Opt Value
            </th>
            <th className="w-[11%] px-1.5 py-2 font-medium text-right sm:px-2">
              My P/L
            </th>
            <SortableTh
              column="pnlPct"
              label="P/L %"
              sortState={sortState}
              onSort={onSort}
              align="right"
              className="w-[8%]"
            />
            <th className="w-[8%] px-1.5 py-2 font-medium text-right sm:px-2">TP</th>
            <SortableTh
              column="breakevenPct"
              label="BE %"
              sortState={sortState}
              onSort={onSort}
              align="right"
              className="w-[10%]"
            />
            <th className="w-[10%] px-1.5 py-2 font-medium text-right sm:px-2">
              Stock
            </th>
            <SortableTh
              column="status"
              label="Status"
              sortState={sortState}
              onSort={onSort}
              className="w-[12%]"
            />
            <th className="w-[6%] px-1.5 py-2 font-medium sm:px-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((trade) => (
            <tr
              key={trade.id}
              onClick={() => onSelect(trade)}
              className="border-b border-terminal-border/50 cursor-pointer transition-colors hover:bg-terminal-elevated/40"
            >
              <td className="px-1.5 py-2 sm:px-2">
                <TickerCell trade={trade} alerts={alerts} />
              </td>
              <td className="truncate px-1.5 py-2 text-terminal-muted sm:px-2">
                {trade.strategyLabel}
              </td>
              <td className="px-1.5 py-2 text-right sm:px-2">
                <DteCell expirationDate={trade.expirationDate} />
              </td>
              <td className="whitespace-nowrap px-1.5 py-2 text-right sm:px-2">
                <CurrentOptionValueCell trade={trade} />
              </td>
              <td className="whitespace-nowrap px-1.5 py-2 text-right sm:px-2">
                <OpenTradePnlCell
                  trade={trade}
                  value={trade.pnlAllocation.myPnl}
                />
              </td>
              <td className="px-1.5 py-2 text-right sm:px-2">
                <OpenTradePnlPctCell
                  trade={trade}
                  value={trade.calculations.currentPnlPct}
                />
              </td>
              <td className="px-1.5 py-2 text-right sm:px-2">
                <TakeProfitPriceCell trade={trade} />
              </td>
              <td className="px-1.5 py-2 text-right sm:px-2">
                <BreakevenSafetyPctCell trade={trade} />
              </td>
              <td className="px-1.5 py-2 text-right sm:px-2">
                <div className="flex flex-col items-end gap-0.5">
                  <span
                    className={cn(
                      "font-mono",
                      !trade.underlyingPriceUsable
                        ? "text-[10px] text-terminal-muted"
                        : "text-terminal-text"
                    )}
                  >
                    {formatUnderlyingPriceDisplay(
                      trade.underlyingPriceUsable
                        ? trade.underlyingCurrentPrice
                        : null
                    )}
                  </span>
                  <UnderlyingPriceMeta trade={trade} />
                </div>
              </td>
              <td className="px-1.5 py-2 sm:px-2">
                <TradeStatusCell trade={trade} />
              </td>
              <td className="px-1.5 py-2 sm:px-2">
                {isOpenTrade(trade) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditValue(trade);
                    }}
                    aria-label={`Edit current value for ${trade.ticker}`}
                    title="Edit current option value"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={11}
                className="px-3 py-10 text-center text-terminal-muted"
              >
                No trades recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DetailedTable({
  rows,
  alerts,
  onSelect,
  onEditValue,
  showRefreshPrice,
  onRefreshPrice,
  refreshPriceBusy,
  sortState,
  onSortChange,
}: {
  rows: EnrichedTrade[];
  alerts: EnrichedAlert[];
  onSelect: (trade: EnrichedTrade) => void;
  onEditValue: (trade: EnrichedTrade) => void;
  showRefreshPrice?: boolean;
  onRefreshPrice?: () => void;
  refreshPriceBusy?: boolean;
  sortState: TradeSortState;
  onSortChange: (sort: TradeSortState) => void;
}) {
  const onSort = (column: TradeSortColumn) =>
    handleSortClick(column, sortState, onSortChange);

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[1720px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
            <SortableThDetailed
              column="underlying"
              label="Underlying"
              sortState={sortState}
              onSort={onSort}
            />
            <SortableThDetailed
              column="strategy"
              label="Strategy"
              sortState={sortState}
              onSort={onSort}
            />
            <th className="px-3 py-2.5 font-medium">Entry Date</th>
            <th className="px-3 py-2.5 font-medium">Expiry Date</th>
            <SortableThDetailed
              column="dte"
              label="DTE"
              sortState={sortState}
              onSort={onSort}
              align="right"
            />
            <th className="px-3 py-2.5 font-medium text-right">Contracts</th>
            <th className="px-3 py-2.5 font-medium">Short Strike</th>
            <th className="px-3 py-2.5 font-medium">Long Strike</th>
            <th className="px-3 py-2.5 font-medium text-right">Width</th>
            <th className="px-3 py-2.5 font-medium text-right">
              Premium Received
            </th>
            <th className="px-3 py-2.5 font-medium text-right">
              Current Option Value
            </th>
            <th className="px-3 py-2.5 font-medium text-right">Total Trade P/L</th>
            <th className="px-3 py-2.5 font-medium text-right">My P/L</th>
            <th className="px-3 py-2.5 font-medium text-right">Client P/L</th>
            <SortableThDetailed
              column="pnlPct"
              label="Current P/L %"
              sortState={sortState}
              onSort={onSort}
              align="right"
            />
            <th className="px-3 py-2.5 font-medium text-right">
              Take Profit Price
            </th>
            <th className="px-3 py-2.5 font-medium text-right">Stock Price</th>
            <th className="px-3 py-2.5 font-medium text-right">
              Breakeven Price
            </th>
            <th className="px-3 py-2.5 font-medium text-right">
              Breakeven Distance
            </th>
            <SortableThDetailed
              column="breakevenPct"
              label="Breakeven Distance %"
              sortState={sortState}
              onSort={onSort}
              align="right"
            />
            <th className="px-3 py-2.5 font-medium">Breakeven Status</th>
            <th className="px-3 py-2.5 font-medium">Nearest BE Side</th>
            <SortableThDetailed
              column="status"
              label="Status"
              sortState={sortState}
              onSort={onSort}
            />
            <th className="px-3 py-2.5 font-medium">Client Allocation</th>
            <th className="px-3 py-2.5 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((trade) => (
            <tr
              key={trade.id}
              onClick={() => onSelect(trade)}
              className="border-b border-terminal-border/50 cursor-pointer transition-colors hover:bg-terminal-elevated/40"
            >
              <td className="px-3 py-2.5">
                <TickerCell trade={trade} alerts={alerts} />
              </td>
              <td className="px-3 py-2.5 text-terminal-muted">
                {trade.strategyLabel}
              </td>
              <td className="px-3 py-2.5 font-mono text-terminal-muted">
                {trade.entryDate}
              </td>
              <td className="px-3 py-2.5 font-mono text-terminal-muted">
                {trade.expirationDate}
              </td>
              <td className="px-3 py-2.5 text-right">
                <DteCell expirationDate={trade.expirationDate} />
              </td>
              <td className="px-3 py-2.5 font-mono text-right">
                {trade.contracts}
              </td>
              <td className="px-3 py-2.5 font-mono">
                {formatShortStrike(trade.strategy, trade.strikes)}
              </td>
              <td className="px-3 py-2.5 font-mono">
                {formatLongStrike(trade.strategy, trade.strikes)}
              </td>
              <td className="px-3 py-2.5 font-mono text-right">
                {trade.calculations.width.toFixed(2)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 font-mono text-right text-terminal-text">
                {formatCurrency(trade.calculations.totalPremiumReceived)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 font-mono text-right text-terminal-text">
                {formatCurrentOptionValueDisplay(trade.manualCurrentOptionValue)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right">
                <OpenTradePnlCell
                  trade={trade}
                  value={trade.pnlAllocation.totalTradePnl}
                />
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right">
                <OpenTradePnlCell
                  trade={trade}
                  value={trade.pnlAllocation.myPnl}
                />
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right">
                <OpenTradePnlCell
                  trade={trade}
                  value={trade.pnlAllocation.clientPnl}
                />
              </td>
              <td className="px-3 py-2.5 text-right">
                <OpenTradePnlPctCell
                  trade={trade}
                  value={trade.calculations.currentPnlPct}
                />
              </td>
              <td className="px-3 py-2.5 text-right">
                <TakeProfitPriceCell trade={trade} />
              </td>
              <td className="px-3 py-2.5 text-right">
                <UnderlyingPriceCell
                  trade={trade}
                  showRefresh={showRefreshPrice}
                  onRefresh={onRefreshPrice}
                  refreshBusy={refreshPriceBusy}
                />
              </td>
              <td className="px-3 py-2.5 font-mono text-right text-terminal-muted">
                {trade.calculations.breakevenPrice != null
                  ? `$${trade.calculations.breakevenPrice.toFixed(2)}`
                  : trade.calculations.breakevenDisplay}
              </td>
              <td className="px-3 py-2.5 font-mono text-right">
                {formatBreakevenDistanceDollars(
                  trade.calculations.breakevenSafetyDistance
                )}
              </td>
              <td className="px-3 py-2.5 text-right">
                <BreakevenSafetyPctCell trade={trade} />
              </td>
              <td className="px-3 py-2.5">
                <BreakevenStatusBadge trade={trade} />
              </td>
              <td className="px-3 py-2.5 text-terminal-muted">
                {trade.calculations.breakevenNearestSide ?? "—"}
              </td>
              <td className="px-3 py-2.5">
                <TradeStatusCell trade={trade} />
              </td>
              <td className="px-3 py-2.5 text-terminal-muted">
                {formatClientAllocation(trade)}
              </td>
              <td className="px-3 py-2.5">
                {isOpenTrade(trade) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditValue(trade);
                    }}
                    aria-label={`Edit current value for ${trade.ticker}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <span className="text-terminal-muted">—</span>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={25}
                className="px-3 py-10 text-center text-terminal-muted"
              >
                No trades recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CardGrid({
  rows,
  alerts,
  onSelect,
  onEdit,
  onEditValue,
  showRefreshPrice,
  onRefreshPrice,
  refreshPriceBusy,
}: {
  rows: EnrichedTrade[];
  alerts: EnrichedAlert[];
  onSelect: (trade: EnrichedTrade) => void;
  onEdit: (trade: EnrichedTrade) => void;
  onEditValue: (trade: EnrichedTrade) => void;
  showRefreshPrice?: boolean;
  onRefreshPrice?: () => void;
  refreshPriceBusy?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-terminal-border px-3 py-10 text-center text-xs text-terminal-muted">
        No trades recorded yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((trade) => (
        <article
          key={trade.id}
          className="rounded-lg border border-terminal-border bg-terminal-elevated/30 p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <TickerCell trade={trade} alerts={alerts} />
              <p className="mt-1 text-xs text-terminal-muted">
                {trade.strategyLabel}
              </p>
              <div className="mt-2">
                <DteCell expirationDate={trade.expirationDate} />
              </div>
            </div>
            <TradeStatusCell trade={trade} />
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div>
              <dt className="text-terminal-muted">Premium Received</dt>
              <dd className="font-mono text-terminal-text">
                {formatCurrency(trade.calculations.totalPremiumReceived)}
              </dd>
            </div>
            <div>
              <dt className="text-terminal-muted">Current Option Value</dt>
              <dd>
                <CurrentOptionValueCell trade={trade} />
              </dd>
            </div>
            <div>
              <dt className="text-terminal-muted">Total Trade P/L</dt>
              <dd>
                <OpenTradePnlCell
                  trade={trade}
                  value={trade.pnlAllocation.totalTradePnl}
                />
              </dd>
            </div>
            <div>
              <dt className="text-terminal-muted">My P/L</dt>
              <dd>
                <OpenTradePnlCell
                  trade={trade}
                  value={trade.pnlAllocation.myPnl}
                />
              </dd>
            </div>
            <div>
              <dt className="text-terminal-muted">Client P/L</dt>
              <dd>
                <OpenTradePnlCell
                  trade={trade}
                  value={trade.pnlAllocation.clientPnl}
                />
              </dd>
            </div>
            <div>
              <dt className="text-terminal-muted">Current P/L %</dt>
              <dd>
                <OpenTradePnlPctCell
                  trade={trade}
                  value={trade.calculations.currentPnlPct}
                />
              </dd>
            </div>
            <div>
              <dt className="text-terminal-muted">Take Profit Price</dt>
              <dd>
                <TakeProfitPriceCell trade={trade} />
              </dd>
            </div>
            <div>
              <dt className="text-terminal-muted">Stock Price</dt>
              <dd>
                <UnderlyingPriceCell
                  trade={trade}
                  showRefresh={showRefreshPrice}
                  onRefresh={onRefreshPrice}
                  refreshBusy={refreshPriceBusy}
                />
              </dd>
            </div>
            <div>
              <dt className="text-terminal-muted">Breakeven Distance %</dt>
              <dd>
                <BreakevenSafetyPctCell trade={trade} />
              </dd>
            </div>
            <div>
              <dt className="text-terminal-muted">Breakeven Status</dt>
              <dd>
                <BreakevenStatusBadge trade={trade} />
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2 border-t border-terminal-border/50 pt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(trade)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelect(trade)}
            >
              Details
            </Button>
            {isOpenTrade(trade) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditValue(trade)}
                aria-label={`Edit current value for ${trade.ticker}`}
              >
                <Pencil className="h-3.5 w-3.5" />
                Value
              </Button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function OpenTradesTable({
  trades,
  viewMode,
  onSelect,
  onEdit,
  onEditValue,
  showAll = false,
  alerts = [],
  showRefreshPrice = false,
  onRefreshPrice,
  refreshPriceBusy = false,
  sortState,
  onSortChange,
}: OpenTradesTableProps) {
  const rows = useMemo(
    () => sortTrades(filterDisplayTrades(trades, showAll), sortState, showAll),
    [trades, showAll, sortState]
  );

  if (viewMode === "card") {
    return (
      <CardGrid
        rows={rows}
        alerts={alerts}
        onSelect={onSelect}
        onEdit={onEdit}
        onEditValue={onEditValue}
        showRefreshPrice={showRefreshPrice}
        onRefreshPrice={onRefreshPrice}
        refreshPriceBusy={refreshPriceBusy}
      />
    );
  }

  if (viewMode === "detailed") {
    return (
      <DetailedTable
        rows={rows}
        alerts={alerts}
        onSelect={onSelect}
        onEditValue={onEditValue}
        showRefreshPrice={showRefreshPrice}
        onRefreshPrice={onRefreshPrice}
        refreshPriceBusy={refreshPriceBusy}
        sortState={sortState}
        onSortChange={onSortChange}
      />
    );
  }

  return (
    <SummaryTable
      rows={rows}
      alerts={alerts}
      onSelect={onSelect}
      onEditValue={onEditValue}
      sortState={sortState}
      onSortChange={onSortChange}
    />
  );
}
