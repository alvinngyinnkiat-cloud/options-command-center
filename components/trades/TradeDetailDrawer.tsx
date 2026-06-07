"use client";

import { useState } from "react";
import {
  closeOptionsTrade,
  deleteOptionsTrade,
  markTradeManaged,
  markTradeRolled,
} from "@/app/actions/trades";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  formatBreakevenDistanceDollars,
  formatBreakevenSafetyPct,
  getBreakevenSafetyTone,
} from "@/lib/trades/breakeven-safety";
import {
  formatCurrency,
  formatOptionValuePerContract,
  formatPercent,
  formatSignedCurrency,
  formatValueSourceLabel,
} from "@/lib/trades/format";
import type { EnrichedTrade } from "@/lib/trades/types";
import { cn } from "@/lib/utils";
import { BookOpen, X } from "lucide-react";
import Link from "next/link";
import { TakeProfitClosePriceCard } from "./TakeProfitClosePriceCard";

interface TradeDetailDrawerProps {
  trade: EnrichedTrade;
  onClose: () => void;
  onEdit: () => void;
  onEditValue: () => void;
  onRefresh: () => void;
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

function actionVariant(action: string) {
  switch (action) {
    case "Close Position":
      return "danger" as const;
    case "Review Position":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}

export function TradeDetailDrawer({
  trade,
  onClose,
  onEdit,
  onEditValue,
  onRefresh,
}: TradeDetailDrawerProps) {
  const [exitDebit, setExitDebit] = useState(
    String(trade.calculations.currentCloseCost)
  );
  const [busy, setBusy] = useState(false);
  const calc = trade.calculations;

  async function runAction(fn: () => Promise<unknown>) {
    setBusy(true);
    await fn();
    setBusy(false);
    onRefresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-terminal-border bg-terminal-surface shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-terminal-border bg-terminal-surface px-4 py-3">
          <div>
            <h2 className="font-mono text-lg font-semibold text-terminal-text">
              {trade.ticker}
            </h2>
            <p className="text-xs text-terminal-muted">
              {trade.strategyLabel} · {trade.statusLabel}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariant(trade.status)}>{trade.statusLabel}</Badge>
            <Badge variant={actionVariant(trade.suggestedAction)}>
              {trade.suggestedAction}
            </Badge>
            {calc.takeProfitReached && (
              <Badge variant="success">Take Profit Reached</Badge>
            )}
            {calc.stopLossWarning && (
              <Badge variant="danger">Stop Loss Warning</Badge>
            )}
            {trade.tradeScore != null && (
              <Badge variant="info">Score {trade.tradeScore}</Badge>
            )}
          </div>

          {trade.alerts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
                Management Alerts
              </p>
              {trade.alerts.map((a) => (
                <p
                  key={a.code}
                  className={cn(
                    "rounded border px-2 py-1.5 text-xs",
                    a.severity === "warning"
                      ? "border-warning/40 bg-warning/10 text-warning"
                      : "border-accent/40 bg-accent/10 text-accent"
                  )}
                >
                  {a.message}
                </p>
              ))}
            </div>
          )}

          <section>
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted mb-2">
              Current Option Value
            </p>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-terminal-muted">Active Value</dt>
                <dd className="font-mono text-terminal-text">
                  {formatOptionValuePerContract(trade.currentOptionValue)}
                </dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Source</dt>
                <dd className="text-terminal-text">
                  {formatValueSourceLabel(trade.currentValueSource)}
                </dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Manual Broker Value</dt>
                <dd className="font-mono text-terminal-text">
                  {trade.manualCurrentOptionValue != null
                    ? formatOptionValuePerContract(
                        trade.manualCurrentOptionValue
                      )
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-terminal-muted">System Value</dt>
                <dd className="font-mono text-terminal-muted">
                  {formatOptionValuePerContract(trade.systemCurrentOptionValue)}
                </dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Difference</dt>
                <dd
                  className={cn(
                    "font-mono",
                    trade.valueDifference != null
                      ? trade.valueDifference >= 0
                        ? "text-warning"
                        : "text-profit"
                      : "text-terminal-muted"
                  )}
                >
                  {trade.valueDifference != null
                    ? formatOptionValuePerContract(trade.valueDifference)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Last Updated</dt>
                <dd className="text-terminal-muted">
                  {trade.currentValueUpdatedAt?.slice(0, 10) ?? "—"}
                </dd>
              </div>
            </dl>
            {trade.status !== "closed" && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={onEditValue}
              >
                Edit Current Option Value
              </Button>
            )}
          </section>

          <section>
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted mb-2">
              Trade Info
            </p>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["Entry", trade.entryDate],
                ["Expiry", trade.expirationDate],
                ["DTE", String(calc.dte)],
                ["Contracts", String(trade.contracts)],
                ["Strikes", trade.strikesDisplay],
                ["Width", calc.width.toFixed(2)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-terminal-muted">{k}</dt>
                  <dd className="font-mono text-terminal-text">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <TakeProfitClosePriceCard
            premiumPerContract={trade.premiumPerContract}
            takeProfitClosePrice={calc.takeProfitClosePrice}
            takeProfitNetOfFees={calc.takeProfitNetOfFees}
          />

          <section>
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted mb-2">
              Pricing & P/L
            </p>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["Premium / Contract", `$${trade.premiumPerContract.toFixed(2)}`],
                ["Premium Received", formatCurrency(calc.totalPremiumReceived)],
                ["Current Close Cost", formatCurrency(calc.currentCloseCost)],
                [
                  "Total Trade P/L",
                  formatSignedCurrency(trade.pnlAllocation.totalTradePnl),
                ],
                ["My P/L", formatSignedCurrency(trade.pnlAllocation.myPnl)],
                [
                  "Client P/L",
                  formatSignedCurrency(trade.pnlAllocation.clientPnl),
                ],
                ["Current P/L %", formatPercent(calc.currentPnlPct)],
                [
                  "Realized P/L",
                  calc.realizedPnl != null
                    ? formatSignedCurrency(calc.realizedPnl)
                    : "—",
                ],
                ["Max Risk", formatCurrency(calc.maxRisk)],
                ["Profit Target", formatCurrency(calc.profitTargetAmount)],
                ["Stop Loss Amount", formatCurrency(calc.stopLossAmount)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-terminal-muted">{k}</dt>
                  <dd className="font-mono text-terminal-text">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted mb-2">
              Breakeven Safety
            </p>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-terminal-muted">Current Stock Price</dt>
                <dd className="font-mono text-terminal-text">
                  {trade.underlyingCurrentPrice != null
                    ? `$${trade.underlyingCurrentPrice.toFixed(2)}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Breakeven Price</dt>
                <dd className="font-mono text-terminal-text">
                  {calc.breakevenPrice != null
                    ? `$${calc.breakevenPrice.toFixed(2)}`
                    : calc.breakevenDisplay}
                </dd>
              </div>
              {trade.strategy === "iron_condor" && (
                <>
                  <div>
                    <dt className="text-terminal-muted">Put Breakeven</dt>
                    <dd className="font-mono text-terminal-text">
                      {calc.breakevenPutPrice != null
                        ? `$${calc.breakevenPutPrice.toFixed(2)}`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-terminal-muted">Call Breakeven</dt>
                    <dd className="font-mono text-terminal-text">
                      {calc.breakevenCallPrice != null
                        ? `$${calc.breakevenCallPrice.toFixed(2)}`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-terminal-muted">Nearest Breakeven Side</dt>
                    <dd className="text-terminal-text">
                      {calc.breakevenNearestSide ?? "—"}
                    </dd>
                  </div>
                </>
              )}
              <div>
                <dt className="text-terminal-muted">Breakeven Distance</dt>
                <dd
                  className={cn(
                    "font-mono",
                    getBreakevenSafetyTone(calc.breakevenSafetyStatus) ===
                      "safe" && "text-profit",
                    getBreakevenSafetyTone(calc.breakevenSafetyStatus) ===
                      "caution" && "text-warning",
                    getBreakevenSafetyTone(calc.breakevenSafetyStatus) ===
                      "danger" && "text-loss",
                    calc.breakevenSafetyStatus == null && "text-terminal-muted"
                  )}
                >
                  {formatBreakevenDistanceDollars(calc.breakevenSafetyDistance)}
                </dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Breakeven Distance %</dt>
                <dd
                  className={cn(
                    "font-mono",
                    getBreakevenSafetyTone(calc.breakevenSafetyStatus) ===
                      "safe" && "text-profit",
                    getBreakevenSafetyTone(calc.breakevenSafetyStatus) ===
                      "caution" && "text-warning",
                    getBreakevenSafetyTone(calc.breakevenSafetyStatus) ===
                      "danger" && "text-loss",
                    calc.breakevenSafetyStatus == null && "text-terminal-muted"
                  )}
                >
                  {formatBreakevenSafetyPct(calc.breakevenSafetyDistancePct)}
                </dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Breakeven Status</dt>
                <dd>
                  {calc.breakevenSafetyStatus ? (
                    <Badge
                      variant={
                        getBreakevenSafetyTone(calc.breakevenSafetyStatus) ===
                        "safe"
                          ? "success"
                          : getBreakevenSafetyTone(
                                calc.breakevenSafetyStatus
                              ) === "caution"
                            ? "warning"
                            : "danger"
                      }
                      className="text-[10px] uppercase"
                    >
                      {calc.breakevenSafetyStatus}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section>
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted mb-2">
              Risk
            </p>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["Buying Power", formatCurrency(calc.buyingPowerUsed)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-terminal-muted">{k}</dt>
                  <dd className="font-mono text-terminal-text">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {trade.notes && (
            <section>
              <p className="text-[10px] uppercase tracking-wider text-terminal-muted mb-2">
                Notes
              </p>
              <p className="text-xs text-terminal-muted whitespace-pre-wrap">
                {trade.notes}
              </p>
            </section>
          )}

          <Link
            href={`/journal?tradeId=${trade.id}`}
            className="flex items-center justify-between gap-2 rounded-md border border-terminal-border p-3 text-xs text-terminal-text transition-colors hover:bg-terminal-elevated/50"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-accent" />
              Trading Journal
            </span>
            <span className="text-terminal-muted">
              {trade.journalEntryCount}{" "}
              {trade.journalEntryCount === 1 ? "entry" : "entries"} ·{" "}
              {trade.journalEntryCount > 0 ? "View" : "Create"}
            </span>
          </Link>

          <div className="space-y-2 border-t border-terminal-border pt-4">
            {trade.status !== "closed" && (
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  className="flex-1 rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                  placeholder="Exit debit to close"
                  value={exitDebit}
                  onChange={(e) => setExitDebit(e.target.value)}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    runAction(() =>
                      closeOptionsTrade(trade.id, parseFloat(exitDebit) || 0)
                    )
                  }
                >
                  Close
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={onEdit} disabled={busy}>
                Edit Trade
              </Button>
              {trade.status === "open" && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => runAction(() => markTradeManaged(trade.id))}
                >
                  Mark Managed
                </Button>
              )}
              {trade.status !== "rolled" && trade.status !== "closed" && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => runAction(() => markTradeRolled(trade.id))}
                >
                  Mark Rolled
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-loss"
                disabled={busy}
                onClick={() => {
                  if (confirm("Delete this trade permanently?")) {
                    runAction(() => deleteOptionsTrade(trade.id));
                    onClose();
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
