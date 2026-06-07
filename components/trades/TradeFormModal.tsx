"use client";

import { useEffect, useMemo, useState } from "react";
import {
  checkActiveTradeForTicker,
  createOptionsTrade,
  updateOptionsTrade,
} from "@/app/actions/trades";
import type { ActiveTradeConflict } from "@/lib/trading-workflow/types";
import { formatCurrency, formatSignedCurrency } from "@/lib/trades/format";
import { formatRiskCurrency } from "@/lib/risk/format";
import { Button } from "@/components/ui/Button";
import { buildTradeCalculations } from "@/lib/trades/calculations";
import {
  CONFIDENCE_LEVELS,
  DEFAULT_STOP_LOSS_PCT,
  DEFAULT_TAKE_PROFIT_PCT,
  TRADE_STATUS_OPTIONS,
  TRADE_STRATEGY_OPTIONS,
} from "@/lib/trades/constants";
import {
  DEFAULT_CLIENT_SHARE_PCT,
  DEFAULT_MY_SHARE_PCT,
} from "@/lib/client-profit-sharing/constants";
import type { ClientProfile } from "@/lib/client-profit-sharing/types";
import type { EnrichedTrade, TradeFormInput } from "@/lib/trades/types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { TakeProfitClosePriceCard } from "./TakeProfitClosePriceCard";
import {
  isLeapsStrategy,
  isSellCallStrategy,
  isSellPutStrategy,
  isVerticalCallSpreadStrategy,
  NAKED_CALL_UNLIMITED_RISK_MESSAGE,
} from "@/lib/trades/strategy-meta";

interface TradeFormModalProps {
  trade?: EnrichedTrade | null;
  clients?: ClientProfile[];
  onClose: () => void;
  onSaved: () => void;
}

function emptyForm(ticker = "SPY"): TradeFormInput {
  const today = new Date().toISOString().split("T")[0];
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  return {
    watchlistId: `mock-${ticker}`,
    ticker,
    strategy: "bull_put_spread",
    status: "open",
    entryDate: today,
    expirationDate: expiry.toISOString().split("T")[0],
    contracts: 1,
    premiumPerContract: 2,
    currentValue: 0,
    exitDebit: null,
    shortStrikePut: null,
    longStrikePut: null,
    shortStrikeCall: null,
    longStrikeCall: null,
    takeProfitTargetPct: DEFAULT_TAKE_PROFIT_PCT,
    stopLossTargetPct: DEFAULT_STOP_LOSS_PCT,
    tradeScore: null,
    recommendedStrategy: null,
    confidenceLevel: null,
    reasonForEntry: null,
    notes: null,
    underlyingAveragePrice: null,
    manualSupport: null,
    manualResistance: null,
    atr14: null,
    tradeOwnership: "personal",
    clientId: null,
    myProfitSharePercent: DEFAULT_MY_SHARE_PCT,
    clientProfitSharePercent: DEFAULT_CLIENT_SHARE_PCT,
    sellCallCoverage: "covered",
    sharesOwned: null,
    parentTradeId: null,
    originalCost: null,
  };
}

function formFromTrade(trade: EnrichedTrade): TradeFormInput {
  return {
    watchlistId: trade.watchlistId,
    ticker: trade.ticker,
    strategy: trade.strategy,
    status: trade.status,
    entryDate: trade.entryDate,
    expirationDate: trade.expirationDate,
    contracts: trade.contracts,
    premiumPerContract: trade.premiumPerContract,
    currentValue: trade.currentValue,
    exitDebit: trade.exitDebit,
    shortStrikePut: trade.strikes.shortStrikePut,
    longStrikePut: trade.strikes.longStrikePut,
    shortStrikeCall: trade.strikes.shortStrikeCall,
    longStrikeCall: trade.strikes.longStrikeCall,
    takeProfitTargetPct: trade.takeProfitTargetPct,
    stopLossTargetPct: trade.stopLossTargetPct,
    tradeScore: trade.tradeScore,
    recommendedStrategy: trade.recommendedStrategy,
    confidenceLevel: trade.confidenceLevel,
    reasonForEntry: trade.reasonForEntry,
    notes: trade.notes,
    underlyingAveragePrice: trade.underlyingAveragePrice,
    manualSupport: trade.manualSupport,
    manualResistance: trade.manualResistance,
    atr14: trade.atr14,
    tradeOwnership: trade.tradeOwnership,
    clientId: trade.clientId,
    myProfitSharePercent: trade.myProfitSharePercent,
    clientProfitSharePercent: trade.clientProfitSharePercent,
    sellCallCoverage: trade.sellCallCoverage,
    sharesOwned: trade.sharesOwned,
    parentTradeId: trade.parentTradeId,
    originalCost: trade.originalCost,
  };
}

function parseNum(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

export function TradeFormModal({
  trade,
  clients = [],
  onClose,
  onSaved,
}: TradeFormModalProps) {
  const isEdit = Boolean(trade);
  const [form, setForm] = useState<TradeFormInput>(
    trade ? formFromTrade(trade) : emptyForm()
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeConflict, setActiveConflict] =
    useState<ActiveTradeConflict | null>(null);
  const [overrideDuplicate, setOverrideDuplicate] = useState(false);
  const tickerKey = form.ticker.trim().toUpperCase();
  const displayConflict =
    isEdit || !tickerKey ? null : activeConflict;

  useEffect(() => {
    if (isEdit) return;
    if (!tickerKey) return;
    let cancelled = false;
    checkActiveTradeForTicker(tickerKey).then((conflict) => {
      if (!cancelled) {
        setActiveConflict(conflict);
        if (!conflict) setOverrideDuplicate(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [form.ticker, isEdit, tickerKey]);

  const previewOptionValue =
    trade?.currentOptionValue ??
    (form.contracts > 0 ? form.currentValue / (100 * form.contracts) : 0);

  const calc = useMemo(
    () =>
      buildTradeCalculations({
        strategy: form.strategy,
        expirationDate: form.expirationDate,
        contracts: form.contracts,
        premiumPerContract: form.premiumPerContract,
        currentOptionValuePerContract: previewOptionValue,
        exitDebit: form.exitDebit,
        status: form.status,
        takeProfitTargetPct: form.takeProfitTargetPct,
        stopLossTargetPct: form.stopLossTargetPct,
        sellCallCoverage: form.sellCallCoverage,
        originalCost: form.originalCost,
        strikes: {
          shortStrikePut: form.shortStrikePut,
          longStrikePut: form.longStrikePut,
          shortStrikeCall: form.shortStrikeCall,
          longStrikeCall: form.longStrikeCall,
        },
      }),
    [form, previewOptionValue]
  );

  function set<K extends keyof TradeFormInput>(key: K, value: TradeFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      watchlistId: `mock-${form.ticker.toUpperCase()}`,
      ticker: form.ticker.toUpperCase(),
      allowDuplicateOverride: overrideDuplicate,
    };
    const result = isEdit
      ? await updateOptionsTrade(trade!.id, payload)
      : await createOptionsTrade(payload);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onSaved();
    onClose();
  }

  const isSellPut = isSellPutStrategy(form.strategy);
  const isSellCall = isSellCallStrategy(form.strategy);
  const isLeaps = isLeapsStrategy(form.strategy);
  const isVertical = isVerticalCallSpreadStrategy(form.strategy);
  const showPut =
    !isLeaps && !isVertical && form.strategy !== "bear_call_spread" && !isSellCall;
  const showLongPut = showPut && !isSellPut;
  const showShortCall = !isLeaps && form.strategy !== "bull_put_spread" && !isSellPut;
  const showLongCallOnly = isLeaps;
  const showLongCallSpread = isVertical || (showShortCall && !isSellCall);
  const showShortCallField = showShortCall && !isLeaps;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-terminal-border bg-terminal-surface shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-terminal-border bg-terminal-surface px-4 py-3">
          <h2 className="text-sm font-semibold text-terminal-text">
            {isEdit ? "Edit Trade" : "Create Trade"}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div className="rounded-md border border-terminal-border p-3 space-y-3">
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Trade Ownership
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tradeOwnership"
                  checked={form.tradeOwnership === "personal"}
                  onChange={() =>
                    setForm((f) => ({
                      ...f,
                      tradeOwnership: "personal",
                      clientId: null,
                    }))
                  }
                />
                Personal Trade
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tradeOwnership"
                  checked={form.tradeOwnership === "client_profit_sharing"}
                  onChange={() =>
                    setForm((f) => ({
                      ...f,
                      tradeOwnership: "client_profit_sharing",
                      clientId: f.clientId ?? clients[0]?.id ?? null,
                    }))
                  }
                />
                Client Profit Sharing
              </label>
            </div>
            {form.tradeOwnership === "client_profit_sharing" && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-[10px] uppercase text-terminal-muted">
                    Client Name
                  </span>
                  <select
                    className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm"
                    value={form.clientId ?? ""}
                    onChange={(e) => {
                      const client = clients.find((c) => c.id === e.target.value);
                      setForm((f) => ({
                        ...f,
                        clientId: e.target.value || null,
                        myProfitSharePercent:
                          client?.mySharePct ?? DEFAULT_MY_SHARE_PCT,
                        clientProfitSharePercent:
                          client?.clientSharePct ?? DEFAULT_CLIENT_SHARE_PCT,
                      }));
                    }}
                    required
                  >
                    <option value="">Select client…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.clientName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] uppercase text-terminal-muted">
                    Client Capital Pool
                  </span>
                  <p className="rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono">
                    {formatRiskCurrency(
                      clients.find((c) => c.id === form.clientId)
                        ?.capitalContributed ?? 0
                    )}
                  </p>
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] uppercase text-terminal-muted">
                    My Share %
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                    value={form.myProfitSharePercent}
                    onChange={(e) => {
                      const my = parseFloat(e.target.value) || 0;
                      setForm((f) => ({
                        ...f,
                        myProfitSharePercent: my,
                        clientProfitSharePercent: 100 - my,
                      }));
                    }}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] uppercase text-terminal-muted">
                    Client Share %
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                    value={form.clientProfitSharePercent}
                    onChange={(e) => {
                      const client = parseFloat(e.target.value) || 0;
                      setForm((f) => ({
                        ...f,
                        clientProfitSharePercent: client,
                        myProfitSharePercent: 100 - client,
                      }));
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">Underlying</span>
              <input
                className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                value={form.ticker}
                onChange={(e) => set("ticker", e.target.value)}
                required
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">Strategy</span>
              <select
                className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm"
                value={form.strategy}
                onChange={(e) => {
                  const strategy = e.target.value as TradeFormInput["strategy"];
                  setForm((f) => ({
                    ...f,
                    strategy,
                    sellCallCoverage:
                      strategy === "sell_call" ? "covered" : f.sellCallCoverage,
                    longStrikePut:
                      strategy === "sell_put" ? null : f.longStrikePut,
                    longStrikeCall:
                      strategy === "sell_call" || strategy === "sell_put"
                        ? null
                        : f.longStrikeCall,
                    shortStrikeCall:
                      strategy === "sell_put" || strategy === "leaps"
                        ? null
                        : f.shortStrikeCall,
                    shortStrikePut:
                      strategy === "sell_call" || strategy === "leaps"
                        ? null
                        : f.shortStrikePut,
                    originalCost:
                      strategy === "leaps" || strategy === "vertical_call_spread"
                        ? f.originalCost
                        : null,
                    parentTradeId:
                      strategy === "leaps" ? null : f.parentTradeId,
                  }));
                }}
              >
                {TRADE_STRATEGY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                    {o.futureOnly ? " (manual)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">Status</span>
              <select
                className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm"
                value={form.status}
                onChange={(e) =>
                  set("status", e.target.value as TradeFormInput["status"])
                }
              >
                {TRADE_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">Entry Date</span>
              <input
                type="date"
                className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm"
                value={form.entryDate}
                onChange={(e) => set("entryDate", e.target.value)}
                required
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">Expiry Date</span>
              <input
                type="date"
                className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm"
                value={form.expirationDate}
                onChange={(e) => set("expirationDate", e.target.value)}
                required
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">Contracts</span>
              <input
                type="number"
                min={1}
                className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                value={form.contracts}
                onChange={(e) => set("contracts", parseInt(e.target.value, 10) || 1)}
              />
            </label>
          </div>

          <div className="rounded-md border border-terminal-border p-3">
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted mb-2">
              Strikes
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {showPut && (
                <>
                  <label className="space-y-1">
                    <span className="text-[10px] text-terminal-muted">
                      {isSellPut ? "Short Put Strike" : "Short Put"}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                      value={form.shortStrikePut ?? ""}
                      onChange={(e) =>
                        set("shortStrikePut", parseNum(e.target.value))
                      }
                    />
                  </label>
                  {showLongPut && (
                    <label className="space-y-1">
                      <span className="text-[10px] text-terminal-muted">Long Put</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                        value={form.longStrikePut ?? ""}
                        onChange={(e) =>
                          set("longStrikePut", parseNum(e.target.value))
                        }
                      />
                    </label>
                  )}
                </>
              )}
              {showLongCallOnly && (
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-[10px] text-terminal-muted">
                    Long Call Strike (LEAPS)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                    value={form.longStrikeCall ?? ""}
                    onChange={(e) =>
                      set("longStrikeCall", parseNum(e.target.value))
                    }
                  />
                </label>
              )}
              {showShortCallField && (
                <>
                  <label className="space-y-1">
                    <span className="text-[10px] text-terminal-muted">
                      {isSellCall ? "Short Call Strike" : "Short Call"}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                      value={form.shortStrikeCall ?? ""}
                      onChange={(e) =>
                        set("shortStrikeCall", parseNum(e.target.value))
                      }
                    />
                  </label>
                  {showLongCallSpread && !showLongCallOnly && (
                    <label className="space-y-1">
                      <span className="text-[10px] text-terminal-muted">
                        {isVertical ? "Long Call" : "Long Call"}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                        value={form.longStrikeCall ?? ""}
                        onChange={(e) =>
                          set("longStrikeCall", parseNum(e.target.value))
                        }
                      />
                    </label>
                  )}
                </>
              )}
            </div>
          </div>

          {(isLeaps || isVertical) && (
            <label className="block space-y-1 max-w-xs">
              <span className="text-[10px] uppercase text-terminal-muted">
                Original Cost (USD)
              </span>
              <input
                type="number"
                step="0.01"
                min={0}
                className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                value={form.originalCost ?? ""}
                onChange={(e) => set("originalCost", parseNum(e.target.value))}
              />
            </label>
          )}

          {isSellCall && form.sellCallCoverage === "covered" && (
            <label className="block space-y-1 max-w-md">
              <span className="text-[10px] uppercase text-terminal-muted">
                Parent LEAPS Trade ID (optional)
              </span>
              <input
                className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                value={form.parentTradeId ?? ""}
                onChange={(e) =>
                  set("parentTradeId", e.target.value.trim() || null)
                }
                placeholder="Link covered call to parent LEAPS"
              />
            </label>
          )}

          {isSellPut && (
            <div className="rounded-md border border-terminal-border p-3 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
              <div>
                <p className="text-[10px] uppercase text-terminal-muted">Cash Required</p>
                <p className="font-mono font-semibold">
                  {calc.cashRequired != null
                    ? formatCurrency(calc.cashRequired)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-terminal-muted">Breakeven</p>
                <p className="font-mono font-semibold">{calc.breakevenDisplay}</p>
              </div>
            </div>
          )}

          {isSellCall && (
            <div className="rounded-md border border-terminal-border p-3 space-y-3">
              <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
                Sell Call — Coverage
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sellCallCoverage"
                    checked={form.sellCallCoverage === "covered"}
                    onChange={() => set("sellCallCoverage", "covered")}
                  />
                  Covered Call
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sellCallCoverage"
                    checked={form.sellCallCoverage === "naked"}
                    onChange={() => set("sellCallCoverage", "naked")}
                  />
                  Naked Call
                </label>
              </div>
              {form.sellCallCoverage === "naked" && (
                <p className="rounded border border-loss/40 bg-loss/10 px-3 py-2 text-xs font-medium text-loss">
                  {NAKED_CALL_UNLIMITED_RISK_MESSAGE}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                <label className="space-y-1">
                  <span className="text-[10px] uppercase text-terminal-muted">
                    Shares Owned
                  </span>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                    value={form.sharesOwned ?? ""}
                    onChange={(e) =>
                      set("sharesOwned", parseNum(e.target.value))
                    }
                  />
                </label>
                <div>
                  <p className="text-[10px] uppercase text-terminal-muted">
                    Required Shares
                  </p>
                  <p className="font-mono font-semibold">
                    {calc.requiredShares ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-terminal-muted">Breakeven</p>
                  <p className="font-mono font-semibold">{calc.breakevenDisplay}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">Premium / Contract</span>
              <input
                type="number"
                step="0.01"
                className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                value={form.premiumPerContract}
                onChange={(e) =>
                  set("premiumPerContract", parseFloat(e.target.value) || 0)
                }
              />
            </label>
            {form.status !== "closed" && (
              <p className="col-span-2 text-[10px] text-terminal-muted">
                Current option value is updated separately via Edit Current Value
                on the trades table (broker manual override).
              </p>
            )}
            {form.status === "closed" && (
              <label className="space-y-1">
                <span className="text-[10px] uppercase text-terminal-muted">Exit Debit</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                  value={form.exitDebit ?? ""}
                  onChange={(e) => set("exitDebit", parseNum(e.target.value))}
                />
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">Trade Score</span>
              <input
                type="number"
                className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm font-mono"
                value={form.tradeScore ?? ""}
                onChange={(e) => set("tradeScore", parseNum(e.target.value))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">Recommended</span>
              <input
                className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm"
                value={form.recommendedStrategy ?? ""}
                onChange={(e) => set("recommendedStrategy", e.target.value || null)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">Confidence</span>
              <select
                className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm"
                value={form.confidenceLevel ?? ""}
                onChange={(e) => set("confidenceLevel", e.target.value || null)}
              >
                <option value="">—</option>
                {CONFIDENCE_LEVELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">Reason For Entry</span>
            <textarea
              className="w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm min-h-[60px]"
              value={form.reasonForEntry ?? ""}
              onChange={(e) => set("reasonForEntry", e.target.value || null)}
            />
          </label>

          <div className="rounded-md border border-accent/30 bg-accent/5 p-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>
              <p className="text-terminal-muted">DTE</p>
              <p className="font-mono font-semibold">{calc.dte}</p>
            </div>
            <div>
              <p className="text-terminal-muted">Width</p>
              <p className="font-mono font-semibold">{calc.width.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-terminal-muted">Max Risk</p>
              <p className="font-mono font-semibold">
                {calc.unlimitedRisk
                  ? "Unlimited"
                  : formatCurrency(calc.maxRisk)}
              </p>
            </div>
            <div>
              <p className="text-terminal-muted">Total Premium</p>
              <p className="font-mono font-semibold">
                {formatCurrency(calc.totalPremiumReceived)}
              </p>
            </div>
            <div>
              <p className="text-terminal-muted">Breakeven</p>
              <p className="font-mono font-semibold">{calc.breakevenDisplay}</p>
            </div>
            <div>
              <p className="text-terminal-muted">Profit Target</p>
              <p className="font-mono font-semibold text-profit">
                {formatCurrency(calc.takeProfitPrice)}
              </p>
            </div>
            <div>
              <p className="text-terminal-muted">Stop Loss</p>
              <p className="font-mono font-semibold text-loss">
                {formatCurrency(calc.stopLossPrice)}
              </p>
            </div>
            <div>
              <p className="text-terminal-muted">Return on Risk</p>
              <p
                className={cn(
                  "font-mono font-semibold",
                  calc.returnOnRiskPct >= 0 ? "text-profit" : "text-loss"
                )}
              >
                {calc.returnOnRiskPct.toFixed(1)}%
              </p>
            </div>
          </div>

          <TakeProfitClosePriceCard
            premiumPerContract={form.premiumPerContract}
            takeProfitClosePrice={calc.takeProfitClosePrice}
            takeProfitNetOfFees={calc.takeProfitNetOfFees}
          />

          {!isEdit && displayConflict && (
            <div className="rounded-md border border-warn/40 bg-warn/10 p-3 space-y-2 text-xs">
              <p className="font-semibold text-warn">
                This ticker already has an active trade.
              </p>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <dt className="text-terminal-muted">Strategy</dt>
                  <dd>{displayConflict.strategy}</dd>
                </div>
                <div>
                  <dt className="text-terminal-muted">Expiry</dt>
                  <dd className="font-mono">{displayConflict.expiryDate}</dd>
                </div>
                <div>
                  <dt className="text-terminal-muted">Max Risk</dt>
                  <dd className="font-mono">
                    {formatRiskCurrency(displayConflict.maxRisk)}
                  </dd>
                </div>
                <div>
                  <dt className="text-terminal-muted">Current P/L</dt>
                  <dd className="font-mono">
                    {formatSignedCurrency(displayConflict.currentPnl)}
                  </dd>
                </div>
                <div>
                  <dt className="text-terminal-muted">Status</dt>
                  <dd>{displayConflict.status}</dd>
                </div>
              </dl>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overrideDuplicate}
                  onChange={(e) => setOverrideDuplicate(e.target.checked)}
                />
                <span>
                  Override one-trade-per-ticker protection (not recommended)
                </span>
              </label>
            </div>
          )}

          {error && <p className="text-xs text-loss">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={
                saving || (!isEdit && displayConflict != null && !overrideDuplicate)
              }
            >
              {saving ? "Saving…" : isEdit ? "Save Trade" : "Create Trade"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
