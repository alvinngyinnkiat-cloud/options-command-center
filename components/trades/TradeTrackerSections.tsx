"use client";

import { AlertWarningIcon } from "@/components/alerts/AlertWarningIcon";
import { Badge } from "@/components/ui/Badge";
import { PnlValue } from "@/components/ui/PnlValue";
import { filterAlertsByTicker } from "@/lib/alerts/summary";
import type { EnrichedAlert } from "@/lib/alerts/types";
import { TRADE_TRACKER_PNL_DECIMALS } from "@/lib/trades/constants";
import {
  formatBreakevenDistancePctDisplay,
  getBreakevenSafetyTone,
} from "@/lib/trades/breakeven-safety";
import {
  formatCurrency,
  formatOptionValuePerContract,
  CURRENT_OPTION_VALUE_NOT_UPDATED,
} from "@/lib/trades/format";
import {
  formatDteLabel,
  MISSING_DTE_LABEL,
  resolveTradeDte,
} from "@/lib/trades/dte-display";
import {
  calculateClientPnL,
  calculateMyPnL,
  calculateRiskShare,
  calculateTotalTradePnL,
  isSharedTrade,
} from "@/lib/trades/pnl-allocation";
import {
  sortTrades,
  toggleTradeSort,
  type TradeSortColumn,
  type TradeSortState,
} from "@/lib/trades/sort-trades";
import type { EnrichedTrade } from "@/lib/trades/types";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo } from "react";

interface TradeTrackerSectionsProps {
  trades: EnrichedTrade[];
  showAll: boolean;
  alerts?: EnrichedAlert[];
  onSelect: (trade: EnrichedTrade) => void;
  sortState: TradeSortState;
  onSortChange: (sort: TradeSortState) => void;
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

function isOpenTrade(trade: EnrichedTrade): boolean {
  return (
    trade.status === "open" ||
    trade.status === "managed" ||
    trade.status === "closing"
  );
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

function TradePnlCell({ trade, value }: { trade: EnrichedTrade; value: number }) {
  if (trade.status !== "closed" && trade.manualCurrentOptionValue == null) {
    return (
      <span className="text-[10px] text-terminal-muted">
        {CURRENT_OPTION_VALUE_NOT_UPDATED}
      </span>
    );
  }
  return (
    <PnlValue
      value={value}
      currency="USD"
      decimals={TRADE_TRACKER_PNL_DECIMALS}
    />
  );
}

function SectionTable({
  title,
  description,
  rows,
  variant,
  alerts,
  onSelect,
  sortState,
  onSortChange,
}: {
  title: string;
  description: string;
  rows: EnrichedTrade[];
  variant: "personal" | "client";
  alerts: EnrichedAlert[];
  onSelect: (trade: EnrichedTrade) => void;
  sortState: TradeSortState;
  onSortChange: (sort: TradeSortState) => void;
}) {
  const onSort = (column: TradeSortColumn) =>
    onSortChange(toggleTradeSort(sortState, column));

  const shareColumns =
    variant === "client" ? (
      <>
        <th className="px-1.5 py-2 font-medium text-right sm:px-2">
          Client Share
        </th>
        <th className="px-1.5 py-2 font-medium text-right sm:px-2">
          My Share
        </th>
      </>
    ) : (
      <>
        <th className="px-1.5 py-2 font-medium text-right sm:px-2">
          My Share
        </th>
        <th className="px-1.5 py-2 font-medium text-right sm:px-2">
          Client Share
        </th>
      </>
    );

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          {title}
        </h2>
        <p className="mt-0.5 text-[11px] text-terminal-muted">{description}</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-terminal-border">
        <table className="w-full min-w-[960px] text-[11px] sm:text-xs">
          <thead>
            <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
              <SortableTh
                column="underlying"
                label="Underlying"
                sortState={sortState}
                onSort={onSort}
              />
              <SortableTh
                column="strategy"
                label="Strategy"
                sortState={sortState}
                onSort={onSort}
              />
              <SortableTh
                column="dte"
                label="DTE"
                sortState={sortState}
                onSort={onSort}
                align="right"
              />
              <SortableTh
                column="status"
                label="Status"
                sortState={sortState}
                onSort={onSort}
              />
              <th className="px-1.5 py-2 font-medium text-right sm:px-2">
                Total P/L
              </th>
              {shareColumns}
              <th className="px-1.5 py-2 font-medium text-right sm:px-2">
                Open Risk
              </th>
              <th className="px-1.5 py-2 font-medium text-right sm:px-2">TP</th>
              <SortableTh
                column="breakevenPct"
                label="BE %"
                sortState={sortState}
                onSort={onSort}
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {rows.map((trade) => {
              const totalPnl = calculateTotalTradePnL(trade);
              const myShare = calculateMyPnL(trade, totalPnl);
              const clientShare = calculateClientPnL(trade, totalPnl);
              const risk = calculateRiskShare(
                trade.calculations.maxRisk,
                trade.tradeOwnership
              );
              const openRisk =
                variant === "client" ? risk.clientRisk : risk.myRisk;
              const dte = resolveTradeDte(trade.expirationDate);

              return (
                <tr
                  key={trade.id}
                  onClick={() => onSelect(trade)}
                  className="cursor-pointer border-b border-terminal-border/50 transition-colors hover:bg-terminal-elevated/40"
                >
                  <td className="px-1.5 py-2 sm:px-2">
                    <span className="inline-flex items-center gap-1.5">
                      <AlertWarningIcon
                        alerts={filterAlertsByTicker(alerts, trade.ticker)}
                      />
                      <span className="font-mono font-semibold text-terminal-text">
                        {trade.ticker}
                      </span>
                    </span>
                  </td>
                  <td className="px-1.5 py-2 text-terminal-muted sm:px-2">
                    {trade.strategyLabel}
                  </td>
                  <td className="px-1.5 py-2 text-right font-mono sm:px-2">
                    {dte != null ? formatDteLabel(dte) : MISSING_DTE_LABEL}
                  </td>
                  <td className="px-1.5 py-2 sm:px-2">
                    <Badge variant={statusVariant(trade.status)}>
                      {trade.statusLabel}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-1.5 py-2 text-right sm:px-2">
                    <TradePnlCell trade={trade} value={totalPnl} />
                  </td>
                  {variant === "client" ? (
                    <>
                      <td className="whitespace-nowrap px-1.5 py-2 text-right sm:px-2">
                        <TradePnlCell trade={trade} value={clientShare} />
                      </td>
                      <td className="whitespace-nowrap px-1.5 py-2 text-right sm:px-2">
                        <TradePnlCell trade={trade} value={myShare} />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="whitespace-nowrap px-1.5 py-2 text-right sm:px-2">
                        <TradePnlCell trade={trade} value={myShare} />
                      </td>
                      <td className="whitespace-nowrap px-1.5 py-2 text-right sm:px-2">
                        <TradePnlCell trade={trade} value={clientShare} />
                      </td>
                    </>
                  )}
                  <td className="whitespace-nowrap px-1.5 py-2 text-right font-mono text-terminal-text sm:px-2">
                    {isOpenTrade(trade)
                      ? formatCurrency(openRisk)
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-1.5 py-2 text-right font-mono text-terminal-text sm:px-2">
                    {formatOptionValuePerContract(
                      trade.calculations.takeProfitClosePrice
                    )}
                  </td>
                  <td className="px-1.5 py-2 text-right sm:px-2">
                    {(() => {
                      const tone = getBreakevenSafetyTone(
                        trade.calculations.breakevenSafetyStatus
                      );
                      const label = formatBreakevenDistancePctDisplay({
                        underlyingPrice: trade.underlyingPriceUsable
                          ? trade.underlyingCurrentPrice
                          : null,
                        distancePct:
                          trade.calculations.breakevenSafetyDistancePct,
                        putDistancePct: trade.calculations.breakevenPutDistancePct,
                        callDistancePct:
                          trade.calculations.breakevenCallDistancePct,
                        isIronCondor: trade.strategy === "iron_condor",
                      });
                      return (
                        <span
                          className={cn(
                            "font-mono font-medium",
                            !trade.underlyingPriceUsable &&
                              "text-[10px] text-terminal-muted",
                            trade.underlyingPriceUsable &&
                              tone === "safe" &&
                              "text-profit",
                            trade.underlyingPriceUsable &&
                              tone === "caution" &&
                              "text-warning",
                            trade.underlyingPriceUsable &&
                              tone === "danger" &&
                              "text-loss",
                            trade.underlyingPriceUsable &&
                              tone === "muted" &&
                              "text-terminal-muted"
                          )}
                        >
                          {label}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-10 text-center text-terminal-muted"
                >
                  No trades recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TradeTrackerSections({
  trades,
  showAll,
  alerts = [],
  onSelect,
  sortState,
  onSortChange,
}: TradeTrackerSectionsProps) {
  const filtered = useMemo(
    () => filterDisplayTrades(trades, showAll),
    [trades, showAll]
  );

  const personalRows = useMemo(
    () => sortTrades(filtered, sortState, showAll),
    [filtered, sortState, showAll]
  );

  const clientRows = useMemo(
    () =>
      sortTrades(
        filtered.filter(isSharedTrade),
        sortState,
        showAll
      ),
    [filtered, sortState, showAll]
  );

  return (
    <div className="space-y-8">
      <SectionTable
        title="Personal Trades"
        description="All personal trades plus shared trades — P/L shown at your 55% share"
        rows={personalRows}
        variant="personal"
        alerts={alerts}
        onSelect={onSelect}
        sortState={sortState}
        onSortChange={onSortChange}
      />
      <SectionTable
        title="Client Trades"
        description="Shared trades only — client 45% share"
        rows={clientRows}
        variant="client"
        alerts={alerts}
        onSelect={onSelect}
        sortState={sortState}
        onSortChange={onSortChange}
      />
    </div>
  );
}
