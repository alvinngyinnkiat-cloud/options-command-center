"use client";

import { useMemo, useState } from "react";
import {
  closeOptionsTrade,
  deleteOptionsTrade,
  markTradeManaged,
  markTradeRolled,
  refreshUnderlyingPrices,
} from "@/app/actions/trades";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  formatBreakevenDistanceDollars,
  formatBreakevenDistancePctDisplay,
  formatBreakevenSafetyPct,
  formatUnderlyingPriceDisplay,
  getBreakevenSafetyTone,
  UNDERLYING_PRICE_UNAVAILABLE,
} from "@/lib/trades/breakeven-safety";
import {
  formatUnderlyingPriceSourceLabel,
} from "@/lib/trades/underlying-price-types";
import {
  formatCurrency,
  formatCurrentOptionValueDisplay,
  formatOptionValuePerContract,
  formatPercent,
  formatSignedCurrency,
  OPTION_PRICE_INPUT_STEP,
  CURRENT_OPTION_VALUE_NOT_UPDATED,
} from "@/lib/trades/format";
import { getPnLColor } from "@/lib/format/pnl";
import type { EnrichedTrade } from "@/lib/trades/types";
import { buildCloseTradePreviewWithFees } from "@/lib/trades/realized-pnl";
import { cn } from "@/lib/utils";
import { BookOpen, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { TakeProfitClosePriceCard } from "./TakeProfitClosePriceCard";

interface TradeDetailDrawerProps {
  trade: EnrichedTrade;
  onClose: () => void;
  onEdit: () => void;
  onEditValue: () => void;
  onRefresh: () => void;
  showRefreshPrice?: boolean;
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

function initialExitDebitPerContract(trade: EnrichedTrade): string {
  if (trade.manualCurrentOptionValue != null) {
    return String(trade.manualCurrentOptionValue);
  }
  if (trade.exitDebitPerContract != null) {
    return String(trade.exitDebitPerContract);
  }
  if (trade.calculations.currentOptionValuePerContract > 0) {
    return String(trade.calculations.currentOptionValuePerContract);
  }
  return "";
}

export function TradeDetailDrawer({
  trade,
  onClose,
  onEdit,
  onEditValue,
  onRefresh,
  showRefreshPrice = false,
}: TradeDetailDrawerProps) {
  const [exitDebitPerContract, setExitDebitPerContract] = useState(() =>
    initialExitDebitPerContract(trade)
  );
  const [feesCommission, setFeesCommission] = useState("0");
  const [busy, setBusy] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const calc = trade.calculations;

  const closePreview = useMemo(() => {
    const perContract = parseFloat(exitDebitPerContract);
    const fees = parseFloat(feesCommission);
    if (!Number.isFinite(perContract) || perContract < 0) return null;
    return buildCloseTradePreviewWithFees({
      premiumPerContract: trade.premiumPerContract,
      contracts: trade.contracts,
      exitDebitPerContract: perContract,
      feesCommission: Number.isFinite(fees) ? fees : 0,
    });
  }, [
    exitDebitPerContract,
    feesCommission,
    trade.premiumPerContract,
    trade.contracts,
  ]);

  async function runAction(fn: () => Promise<{ success: boolean; error?: string }>) {
    setBusy(true);
    setActionError(null);
    const result = await fn();
    setBusy(false);
    if (!result.success) {
      setActionError(result.error ?? "Action failed.");
      return;
    }
    onRefresh();
  }

  async function handleRefreshPrice() {
    setRefreshBusy(true);
    await refreshUnderlyingPrices();
    setRefreshBusy(false);
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
          {actionError && (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {actionError}
            </p>
          )}
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
                <dt className="text-terminal-muted">Current Value</dt>
                <dd
                  className={cn(
                    "font-mono",
                    trade.manualCurrentOptionValue == null &&
                      "text-[10px] text-terminal-muted"
                  )}
                >
                  {formatCurrentOptionValueDisplay(trade.manualCurrentOptionValue)}
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
                ["Premium / Contract", formatOptionValuePerContract(trade.premiumPerContract)],
                ["Premium Received", formatCurrency(calc.totalPremiumReceived)],
                ...(trade.status === "closed"
                  ? [
                      [
                        "Closing Debit / Contract",
                        trade.exitDebitPerContract != null
                          ? formatOptionValuePerContract(
                              trade.exitDebitPerContract
                            )
                          : "—",
                      ] as const,
                      [
                        "Total Closing Debit",
                        trade.exitDebit != null
                          ? formatCurrency(trade.exitDebit)
                          : "—",
                      ] as const,
                      [
                        "Fees / Commission",
                        formatCurrency(trade.feesCommission),
                      ] as const,
                      [
                        "Calculated Realized P/L",
                        calc.calculatedRealizedPnl != null
                          ? formatSignedCurrency(calc.calculatedRealizedPnl)
                          : "—",
                      ] as const,
                      [
                        "Broker Realized P/L Override",
                        trade.brokerRealizedPnl != null
                          ? formatSignedCurrency(trade.brokerRealizedPnl)
                          : "—",
                      ] as const,
                    ]
                  : [
                      [
                        "Current Close Cost",
                        formatCurrency(calc.currentCloseCost),
                      ] as const,
                    ]),
                [
                  trade.status === "closed" ? "Realized P/L" : "Total Trade P/L",
                  formatSignedCurrency(trade.pnlAllocation.totalTradePnl),
                ],
                ["My P/L", formatSignedCurrency(trade.pnlAllocation.myPnl)],
                [
                  "Client P/L",
                  formatSignedCurrency(trade.pnlAllocation.clientPnl),
                ],
                ...(trade.status !== "closed"
                  ? [
                      ["Current P/L %", formatPercent(calc.currentPnlPct)] as const,
                      [
                        "Realized P/L",
                        calc.realizedPnl != null
                          ? formatSignedCurrency(calc.realizedPnl)
                          : "—",
                      ] as const,
                    ]
                  : []),
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
                <dt className="text-terminal-muted">Current Underlying Price</dt>
                <dd className="flex items-center gap-2">
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
                  {showRefreshPrice && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      disabled={refreshBusy}
                      onClick={handleRefreshPrice}
                    >
                      <RefreshCw
                        className={cn(
                          "h-3 w-3 mr-1",
                          refreshBusy && "animate-spin"
                        )}
                      />
                      Refresh
                    </Button>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Price Source</dt>
                <dd className="text-terminal-text">
                  {formatUnderlyingPriceSourceLabel(trade.underlyingPriceSource)}
                </dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Last Updated</dt>
                <dd className="font-mono text-terminal-muted">
                  {trade.underlyingPriceUpdatedAt?.slice(0, 10) ?? "—"}
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
                    !trade.underlyingPriceUsable &&
                      "text-[10px] text-terminal-muted",
                    trade.underlyingPriceUsable &&
                      getBreakevenSafetyTone(calc.breakevenSafetyStatus) ===
                        "safe" &&
                      "text-profit",
                    trade.underlyingPriceUsable &&
                      getBreakevenSafetyTone(calc.breakevenSafetyStatus) ===
                        "caution" &&
                      "text-warning",
                    trade.underlyingPriceUsable &&
                      getBreakevenSafetyTone(calc.breakevenSafetyStatus) ===
                        "danger" &&
                      "text-loss"
                  )}
                >
                  {formatBreakevenDistancePctDisplay({
                    underlyingPrice: trade.underlyingPriceUsable
                      ? trade.underlyingCurrentPrice
                      : null,
                    distancePct: calc.breakevenSafetyDistancePct,
                    putDistancePct: calc.breakevenPutDistancePct,
                    callDistancePct: calc.breakevenCallDistancePct,
                    isIronCondor: trade.strategy === "iron_condor",
                  })}
                </dd>
              </div>
              {trade.strategy === "iron_condor" && trade.underlyingPriceUsable && (
                  <>
                    <div>
                      <dt className="text-terminal-muted">Put BE Distance %</dt>
                      <dd className="font-mono text-terminal-text">
                        {formatBreakevenSafetyPct(calc.breakevenPutDistancePct)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-terminal-muted">Call BE Distance %</dt>
                      <dd className="font-mono text-terminal-text">
                        {formatBreakevenSafetyPct(
                          calc.breakevenCallDistancePct
                        )}
                      </dd>
                    </div>
                  </>
                )}
              <div>
                <dt className="text-terminal-muted">Breakeven Status</dt>
                <dd>
                  {!trade.underlyingPriceUsable ? (
                    <span className="text-[10px] text-terminal-muted">
                      {UNDERLYING_PRICE_UNAVAILABLE}
                    </span>
                  ) : calc.breakevenSafetyStatus ? (
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
              <div className="space-y-3 rounded-lg border border-terminal-border bg-terminal-elevated/30 p-3">
                <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
                  Close Trade
                </p>
                <label className="block space-y-1">
                  <span className="text-[10px] uppercase text-terminal-muted">
                    Closing Debit Per Contract
                  </span>
                  <input
                    type="number"
                    step={OPTION_PRICE_INPUT_STEP}
                    min="0"
                    className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                    placeholder="e.g. 0.514"
                    value={exitDebitPerContract}
                    onChange={(e) => setExitDebitPerContract(e.target.value)}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] uppercase text-terminal-muted">
                    Fees / Commission (USD)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                    placeholder="e.g. 0.49"
                    value={feesCommission}
                    onChange={(e) => setFeesCommission(e.target.value)}
                  />
                </label>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-terminal-muted">Contracts</dt>
                    <dd className="font-mono">{trade.contracts}</dd>
                  </div>
                  <div>
                    <dt className="text-terminal-muted">Premium Received</dt>
                    <dd className="font-mono">
                      {formatCurrency(calc.totalPremiumReceived)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-terminal-muted">Total Closing Debit</dt>
                    <dd className="font-mono">
                      {closePreview
                        ? formatCurrency(closePreview.exitDebitTotal)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-terminal-muted">Fees / Commission</dt>
                    <dd className="font-mono">
                      {closePreview
                        ? formatCurrency(closePreview.feesCommission)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-terminal-muted">Calculated Realized P/L</dt>
                    <dd
                      className={cn(
                        "font-mono",
                        closePreview
                          ? getPnLColor(closePreview.calculatedRealizedPnl)
                          : "text-terminal-muted"
                      )}
                    >
                      {closePreview
                        ? formatSignedCurrency(closePreview.calculatedRealizedPnl)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-terminal-muted">Estimated Net P/L</dt>
                    <dd
                      className={cn(
                        "font-mono",
                        closePreview
                          ? getPnLColor(closePreview.estimatedRealizedPnl)
                          : "text-terminal-muted"
                      )}
                    >
                      {closePreview
                        ? formatSignedCurrency(
                            closePreview.estimatedRealizedPnl
                          )
                        : "—"}
                    </dd>
                  </div>
                </dl>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy || !closePreview}
                  onClick={() =>
                    runAction(() =>
                      closeOptionsTrade(
                        trade.id,
                        parseFloat(exitDebitPerContract) || 0,
                        parseFloat(feesCommission) || 0
                      )
                    )
                  }
                >
                  Close Trade
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
