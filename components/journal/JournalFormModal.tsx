"use client";

import { useMemo, useState } from "react";
import {
  createJournalEntry,
  updateJournalEntry,
} from "@/app/actions/journal";
import { Button } from "@/components/ui/Button";
import { buildJournalComputedFields } from "@/lib/journal/calculations";
import { EXIT_REASON_OPTIONS } from "@/lib/journal/constants";
import {
  formatCurrency,
  formatSignedCurrency,
} from "@/lib/journal/format";
import { journalFormFromTrade } from "@/lib/journal/map-entry";
import type { EnrichedJournalEntry, JournalFormInput } from "@/lib/journal/types";
import { CONFIDENCE_LEVELS, TRADE_STRATEGY_OPTIONS } from "@/lib/trades/constants";
import type { EnrichedTrade } from "@/lib/trades/types";
import { X } from "lucide-react";

interface JournalFormModalProps {
  entry?: EnrichedJournalEntry | null;
  trades: EnrichedTrade[];
  prefillTrade?: EnrichedTrade | null;
  onClose: () => void;
  onSaved: (data?: import("@/lib/journal/types").JournalTrackerData) => void;
}

function emptyForm(): JournalFormInput {
  return {
    tradeId: null,
    ticker: "SPY",
    entryDate: new Date().toISOString().split("T")[0],
    strategy: "bull_put_spread",
    dte: null,
    contracts: 1,
    shortStrike: null,
    longStrike: null,
    width: null,
    creditReceived: null,
    breakeven: null,
    maxRisk: null,
    buyingPowerUsed: null,
    tradeScore: null,
    confidenceLevel: null,
    reasonForEntry: null,
    exitDate: null,
    exitDebit: null,
    exitReason: null,
    lessonLearned: null,
    entrySetup: null,
    exitOutcome: null,
    whatWentWell: null,
    whatToImprove: null,
    reviewNotes: null,
    screenshotUrl: null,
    tags: [],
  };
}

function formFromEntry(entry: EnrichedJournalEntry): JournalFormInput {
  return {
    tradeId: entry.tradeId,
    ticker: entry.ticker,
    entryDate: entry.entryDate,
    strategy: entry.strategy,
    dte: entry.dte,
    contracts: entry.contracts,
    shortStrike: entry.shortStrike,
    longStrike: entry.longStrike,
    width: entry.width,
    creditReceived: entry.creditReceived,
    breakeven: entry.breakeven,
    maxRisk: entry.maxRisk,
    buyingPowerUsed: entry.buyingPowerUsed,
    tradeScore: entry.tradeScore,
    confidenceLevel: entry.confidenceLevel,
    reasonForEntry: entry.reasonForEntry,
    exitDate: entry.exitDate,
    exitDebit: entry.exitDebit,
    exitReason: entry.exitReason,
    lessonLearned: entry.lessonLearned,
    entrySetup: entry.entrySetup,
    exitOutcome: entry.exitOutcome,
    whatWentWell: entry.whatWentWell,
    whatToImprove: entry.whatToImprove,
    reviewNotes: entry.reviewNotes,
    screenshotUrl: entry.screenshotUrl,
    tags: entry.tags,
  };
}

function parseNum(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

const inputClass =
  "w-full rounded border border-terminal-border bg-terminal-elevated px-2 py-1.5 text-sm";
const labelClass = "text-[10px] uppercase text-terminal-muted";

export function JournalFormModal({
  entry,
  trades,
  prefillTrade,
  onClose,
  onSaved,
}: JournalFormModalProps) {
  const isEdit = Boolean(entry);
  const [form, setForm] = useState<JournalFormInput>(() => {
    if (entry) return formFromEntry(entry);
    if (prefillTrade) return journalFormFromTrade(prefillTrade);
    return emptyForm();
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const computed = useMemo(
    () =>
      buildJournalComputedFields({
        entryDate: form.entryDate,
        exitDate: form.exitDate,
        creditReceived: form.creditReceived,
        exitDebit: form.exitDebit,
        maxRisk: form.maxRisk,
      }),
    [form]
  );

  function set<K extends keyof JournalFormInput>(
    key: K,
    value: JournalFormInput[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleTradeLink(tradeId: string) {
    if (!tradeId) {
      set("tradeId", null);
      return;
    }
    const trade = trades.find((t) => t.id === tradeId);
    if (trade) {
      setForm(journalFormFromTrade(trade));
    } else {
      set("tradeId", tradeId);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = { ...form, ticker: form.ticker.toUpperCase() };
    const result = isEdit
      ? await updateJournalEntry(entry!.id, payload, entry!.createdAt)
      : await createJournalEntry(payload);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onSaved(result.data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-terminal-border bg-terminal-surface shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-terminal-border bg-terminal-surface px-4 py-3">
          <h2 className="text-sm font-semibold text-terminal-text">
            {isEdit ? "Edit Journal Entry" : "Create Journal Entry"}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-4">
          <section className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Link to Options Trade
            </p>
            <select
              className={inputClass}
              value={form.tradeId ?? ""}
              onChange={(e) => handleTradeLink(e.target.value)}
            >
              <option value="">No linked trade</option>
              {trades.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ticker} · {t.strategyLabel} · {t.statusLabel}
                </option>
              ))}
            </select>
          </section>

          <section className="space-y-3">
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Entry Data
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <label className="space-y-1">
                <span className={labelClass}>Entry Date</span>
                <input
                  type="date"
                  className={inputClass}
                  value={form.entryDate}
                  onChange={(e) => set("entryDate", e.target.value)}
                  required
                />
              </label>
              <label className="space-y-1">
                <span className={labelClass}>Ticker</span>
                <input
                  className={`${inputClass} font-mono`}
                  value={form.ticker}
                  onChange={(e) => set("ticker", e.target.value)}
                  required
                />
              </label>
              <label className="space-y-1">
                <span className={labelClass}>Strategy</span>
                <select
                  className={inputClass}
                  value={form.strategy ?? ""}
                  onChange={(e) =>
                    set(
                      "strategy",
                      (e.target.value || null) as JournalFormInput["strategy"]
                    )
                  }
                >
                  {TRADE_STRATEGY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className={labelClass}>DTE</span>
                <input
                  type="number"
                  className={inputClass}
                  value={form.dte ?? ""}
                  onChange={(e) => set("dte", parseNum(e.target.value))}
                />
              </label>
              <label className="space-y-1">
                <span className={labelClass}>Contracts</span>
                <input
                  type="number"
                  className={inputClass}
                  value={form.contracts ?? ""}
                  onChange={(e) => set("contracts", parseNum(e.target.value))}
                />
              </label>
              <label className="space-y-1">
                <span className={labelClass}>Short Strike</span>
                <input
                  type="number"
                  step="0.5"
                  className={inputClass}
                  value={form.shortStrike ?? ""}
                  onChange={(e) => set("shortStrike", parseNum(e.target.value))}
                />
              </label>
              <label className="space-y-1">
                <span className={labelClass}>Long Strike</span>
                <input
                  type="number"
                  step="0.5"
                  className={inputClass}
                  value={form.longStrike ?? ""}
                  onChange={(e) => set("longStrike", parseNum(e.target.value))}
                />
              </label>
              <label className="space-y-1">
                <span className={labelClass}>Width</span>
                <input
                  type="number"
                  step="0.5"
                  className={inputClass}
                  value={form.width ?? ""}
                  onChange={(e) => set("width", parseNum(e.target.value))}
                />
              </label>
              <label className="space-y-1">
                <span className={labelClass}>Credit Received ($)</span>
                <input
                  type="number"
                  step="1"
                  className={inputClass}
                  value={form.creditReceived ?? ""}
                  onChange={(e) =>
                    set("creditReceived", parseNum(e.target.value))
                  }
                />
              </label>
              <label className="space-y-1">
                <span className={labelClass}>Breakeven</span>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={form.breakeven ?? ""}
                  onChange={(e) => set("breakeven", parseNum(e.target.value))}
                />
              </label>
              <label className="space-y-1">
                <span className={labelClass}>Maximum Risk ($)</span>
                <input
                  type="number"
                  step="1"
                  className={inputClass}
                  value={form.maxRisk ?? ""}
                  onChange={(e) => set("maxRisk", parseNum(e.target.value))}
                />
              </label>
              <label className="space-y-1">
                <span className={labelClass}>Buying Power Used ($)</span>
                <input
                  type="number"
                  step="1"
                  className={inputClass}
                  value={form.buyingPowerUsed ?? ""}
                  onChange={(e) =>
                    set("buyingPowerUsed", parseNum(e.target.value))
                  }
                />
              </label>
              <label className="space-y-1">
                <span className={labelClass}>Trade Score</span>
                <input
                  type="number"
                  className={inputClass}
                  value={form.tradeScore ?? ""}
                  onChange={(e) => set("tradeScore", parseNum(e.target.value))}
                />
              </label>
              <label className="space-y-1">
                <span className={labelClass}>Confidence Level</span>
                <select
                  className={inputClass}
                  value={form.confidenceLevel ?? ""}
                  onChange={(e) =>
                    set("confidenceLevel", e.target.value || null)
                  }
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
              <span className={labelClass}>Reason For Entry</span>
              <textarea
                className={`${inputClass} min-h-[60px]`}
                value={form.reasonForEntry ?? ""}
                onChange={(e) => set("reasonForEntry", e.target.value || null)}
              />
            </label>
          </section>

          <section className="space-y-3">
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Exit Data
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <label className="space-y-1">
                <span className={labelClass}>Exit Date</span>
                <input
                  type="date"
                  className={inputClass}
                  value={form.exitDate ?? ""}
                  onChange={(e) => set("exitDate", e.target.value || null)}
                />
              </label>
              <label className="space-y-1">
                <span className={labelClass}>Exit Debit ($)</span>
                <input
                  type="number"
                  step="1"
                  className={inputClass}
                  value={form.exitDebit ?? ""}
                  onChange={(e) => set("exitDebit", parseNum(e.target.value))}
                />
              </label>
              <label className="space-y-1">
                <span className={labelClass}>Exit Reason</span>
                <select
                  className={inputClass}
                  value={form.exitReason ?? ""}
                  onChange={(e) =>
                    set(
                      "exitReason",
                      (e.target.value || null) as JournalFormInput["exitReason"]
                    )
                  }
                >
                  <option value="">—</option>
                  {EXIT_REASON_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block space-y-1">
              <span className={labelClass}>Lesson Learned</span>
              <textarea
                className={`${inputClass} min-h-[60px]`}
                value={form.lessonLearned ?? ""}
                onChange={(e) => set("lessonLearned", e.target.value || null)}
              />
            </label>
            {computed.profitLoss != null && (
              <div className="rounded border border-terminal-border bg-terminal-elevated/50 p-3 text-xs">
                <p className="mb-1 text-[10px] uppercase text-terminal-muted">
                  Computed Exit Metrics
                </p>
                <div className="flex flex-wrap gap-4 font-mono">
                  <span>Days Held: {computed.daysHeld}</span>
                  <span>
                    P/L: {formatSignedCurrency(computed.profitLoss)}
                  </span>
                  {computed.returnOnRiskPct != null && (
                    <span>RoR: {computed.returnOnRiskPct.toFixed(1)}%</span>
                  )}
                  {computed.winLoss && (
                    <span>Result: {computed.winLoss}</span>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Trade Review
            </p>
            <label className="block space-y-1">
              <span className={labelClass}>Entry Setup</span>
              <textarea
                className={`${inputClass} min-h-[60px]`}
                value={form.entrySetup ?? ""}
                onChange={(e) => set("entrySetup", e.target.value || null)}
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Exit Outcome</span>
              <textarea
                className={`${inputClass} min-h-[60px]`}
                value={form.exitOutcome ?? ""}
                onChange={(e) => set("exitOutcome", e.target.value || null)}
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>What Went Well</span>
              <textarea
                className={`${inputClass} min-h-[50px]`}
                value={form.whatWentWell ?? ""}
                onChange={(e) => set("whatWentWell", e.target.value || null)}
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>What To Improve</span>
              <textarea
                className={`${inputClass} min-h-[50px]`}
                value={form.whatToImprove ?? ""}
                onChange={(e) => set("whatToImprove", e.target.value || null)}
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Screenshot URL (placeholder)</span>
              <input
                className={inputClass}
                placeholder="Paste image URL when available"
                value={form.screenshotUrl ?? ""}
                onChange={(e) => set("screenshotUrl", e.target.value || null)}
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Notes</span>
              <textarea
                className={`${inputClass} min-h-[60px]`}
                value={form.reviewNotes ?? ""}
                onChange={(e) => set("reviewNotes", e.target.value || null)}
              />
            </label>
          </section>

          {error && (
            <p className="text-xs text-loss">{error}</p>
          )}

          <div className="flex justify-end gap-2 border-t border-terminal-border pt-4">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Entry"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
