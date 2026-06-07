"use client";

import { AlertWarningIcon } from "@/components/alerts/AlertWarningIcon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { filterAlertsByTicker } from "@/lib/alerts/summary";
import type { EnrichedAlert } from "@/lib/alerts/types";
import { calculateDte } from "@/lib/trades/calculations";
import { DTE_URGENT_THRESHOLD } from "@/lib/trades/constants";
import {
  formatBreakevenDistanceDollars,
  formatBreakevenSafetyPct,
  getBreakevenSafetyTone,
} from "@/lib/trades/breakeven-safety";
import {
  formatClientAllocation,
  formatCurrency,
  formatLongStrike,
  formatOptionValuePerContract,
  formatPercent,
  formatShortStrike,
  formatSignedCurrency,
  formatValueSourceLabel,
} from "@/lib/trades/format";
import {
  formatDteLabel,
  getDteReviewLabel,
  getDteTone,
} from "@/lib/trades/dte-display";
import type { EnrichedTrade, TradeTrackerViewMode } from "@/lib/trades/types";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";

interface OpenTradesTableProps {
  trades: EnrichedTrade[];
  viewMode: TradeTrackerViewMode;
  onSelect: (trade: EnrichedTrade) => void;
  onEdit: (trade: EnrichedTrade) => void;
  onEditValue: (trade: EnrichedTrade) => void;
  showAll?: boolean;
  alerts?: EnrichedAlert[];
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
  return (
    <span
      className={cn(
        "font-mono font-medium",
        value >= 0 ? "text-profit" : "text-loss",
        className
      )}
    >
      {formatSignedCurrency(value)}
    </span>
  );
}

function PnlPctCell({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono",
        value >= 0 ? "text-profit" : "text-loss",
        className
      )}
    >
      {formatPercent(value)}
    </span>
  );
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
  const dte = calculateDte(expirationDate);
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
  const pct = trade.calculations.breakevenSafetyDistancePct;
  const tone = getBreakevenSafetyTone(trade.calculations.breakevenSafetyStatus);

  return (
    <span
      className={cn(
        "font-mono font-medium",
        tone === "safe" && "text-profit",
        tone === "caution" && "text-warning",
        tone === "danger" && "text-loss",
        tone === "muted" && "text-terminal-muted"
      )}
    >
      {formatBreakevenSafetyPct(pct)}
    </span>
  );
}

function BreakevenStatusBadge({ trade }: { trade: EnrichedTrade }) {
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
  const dte = calculateDte(trade.expirationDate);
  const reviewLabel = getDteReviewLabel(dte);

  return (
    <div className="flex flex-col items-start gap-0.5">
      {trade.calculations.takeProfitReached ? (
        <Badge variant="success" className="text-[10px] uppercase">
          TP HIT
        </Badge>
      ) : (
        <StatusBadge trade={trade} />
      )}
      {reviewLabel && (
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
    <>
      <span className="font-mono text-terminal-text">
        {formatOptionValuePerContract(trade.currentOptionValue)}
      </span>
      <span className="block truncate text-[10px] text-terminal-muted">
        {formatValueSourceLabel(trade.currentValueSource)}
      </span>
    </>
  );
}

function SummaryTable({
  rows,
  alerts,
  onSelect,
}: {
  rows: EnrichedTrade[];
  alerts: EnrichedAlert[];
  onSelect: (trade: EnrichedTrade) => void;
}) {
  return (
    <div className="rounded-lg border border-terminal-border">
      <table className="w-full table-fixed text-[11px] sm:text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
            <th className="w-[14%] px-1.5 py-2 font-medium sm:px-2">Underlying</th>
            <th className="w-[12%] px-1.5 py-2 font-medium sm:px-2">Strategy</th>
            <th className="w-[14%] px-1.5 py-2 font-medium text-right sm:px-2">
              Opt Value
            </th>
            <th className="w-[11%] px-1.5 py-2 font-medium text-right sm:px-2">
              My P/L
            </th>
            <th className="w-[10%] px-1.5 py-2 font-medium text-right sm:px-2">
              P/L %
            </th>
            <th className="w-[10%] px-1.5 py-2 font-medium text-right sm:px-2">TP</th>
            <th className="w-[13%] px-1.5 py-2 font-medium text-right sm:px-2">
              BE %
            </th>
            <th className="w-[16%] px-1.5 py-2 font-medium sm:px-2">Status</th>
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
                <CurrentOptionValueCell trade={trade} />
              </td>
              <td className="px-1.5 py-2 text-right sm:px-2">
                <PnlCell value={trade.pnlAllocation.myPnl} />
              </td>
              <td className="px-1.5 py-2 text-right sm:px-2">
                <PnlPctCell value={trade.calculations.currentPnlPct} />
              </td>
              <td className="px-1.5 py-2 text-right sm:px-2">
                <TakeProfitPriceCell trade={trade} />
              </td>
              <td className="px-1.5 py-2 text-right sm:px-2">
                <BreakevenSafetyPctCell trade={trade} />
              </td>
              <td className="px-1.5 py-2 sm:px-2">
                <TradeStatusCell trade={trade} />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="px-3 py-10 text-center text-terminal-muted"
              >
                No trades to display.
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
}: {
  rows: EnrichedTrade[];
  alerts: EnrichedAlert[];
  onSelect: (trade: EnrichedTrade) => void;
  onEditValue: (trade: EnrichedTrade) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[1600px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
            <th className="px-3 py-2.5 font-medium">Underlying</th>
            <th className="px-3 py-2.5 font-medium">Strategy</th>
            <th className="px-3 py-2.5 font-medium">Entry Date</th>
            <th className="px-3 py-2.5 font-medium">Expiry Date</th>
            <th className="px-3 py-2.5 font-medium text-right">DTE</th>
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
            <th className="px-3 py-2.5 font-medium text-right">
              Current P/L %
            </th>
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
            <th className="px-3 py-2.5 font-medium text-right">
              Breakeven Distance %
            </th>
            <th className="px-3 py-2.5 font-medium">Breakeven Status</th>
            <th className="px-3 py-2.5 font-medium">Nearest BE Side</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
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
              <td className="px-3 py-2.5 font-mono text-right text-terminal-text">
                {formatCurrency(trade.calculations.totalPremiumReceived)}
              </td>
              <td className="px-3 py-2.5 font-mono text-right text-terminal-text">
                {formatOptionValuePerContract(trade.currentOptionValue)}
              </td>
              <td className="px-3 py-2.5 text-right">
                <PnlCell value={trade.pnlAllocation.totalTradePnl} />
              </td>
              <td className="px-3 py-2.5 text-right">
                <PnlCell value={trade.pnlAllocation.myPnl} />
              </td>
              <td className="px-3 py-2.5 text-right">
                <PnlCell value={trade.pnlAllocation.clientPnl} />
              </td>
              <td className="px-3 py-2.5 text-right">
                <PnlPctCell value={trade.calculations.currentPnlPct} />
              </td>
              <td className="px-3 py-2.5 text-right">
                <TakeProfitPriceCell trade={trade} />
              </td>
              <td className="px-3 py-2.5 font-mono text-right text-terminal-text">
                {trade.underlyingCurrentPrice != null
                  ? `$${trade.underlyingCurrentPrice.toFixed(2)}`
                  : "—"}
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
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={25}
                className="px-3 py-10 text-center text-terminal-muted"
              >
                No trades to display.
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
}: {
  rows: EnrichedTrade[];
  alerts: EnrichedAlert[];
  onSelect: (trade: EnrichedTrade) => void;
  onEdit: (trade: EnrichedTrade) => void;
  onEditValue: (trade: EnrichedTrade) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-terminal-border px-3 py-10 text-center text-xs text-terminal-muted">
        No trades to display.
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
                <PnlCell value={trade.pnlAllocation.totalTradePnl} />
              </dd>
            </div>
            <div>
              <dt className="text-terminal-muted">My P/L</dt>
              <dd>
                <PnlCell value={trade.pnlAllocation.myPnl} />
              </dd>
            </div>
            <div>
              <dt className="text-terminal-muted">Client P/L</dt>
              <dd>
                <PnlCell value={trade.pnlAllocation.clientPnl} />
              </dd>
            </div>
            <div>
              <dt className="text-terminal-muted">Current P/L %</dt>
              <dd>
                <PnlPctCell value={trade.calculations.currentPnlPct} />
              </dd>
            </div>
            <div>
              <dt className="text-terminal-muted">Take Profit Price</dt>
              <dd>
                <TakeProfitPriceCell trade={trade} />
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditValue(trade)}
              aria-label={`Edit current value for ${trade.ticker}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
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
}: OpenTradesTableProps) {
  const rows = filterDisplayTrades(trades, showAll);

  if (viewMode === "card") {
    return (
      <CardGrid
        rows={rows}
        alerts={alerts}
        onSelect={onSelect}
        onEdit={onEdit}
        onEditValue={onEditValue}
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
      />
    );
  }

  return (
    <SummaryTable rows={rows} alerts={alerts} onSelect={onSelect} />
  );
}
