"use client";

import { useState } from "react";
import { deleteJournalEntry } from "@/app/actions/journal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  formatCurrency,
  formatSignedCurrency,
} from "@/lib/journal/format";
import type { EnrichedJournalEntry } from "@/lib/journal/types";
import { cn } from "@/lib/utils";
import { ImageIcon, Link2, X } from "lucide-react";
import Link from "next/link";

interface JournalReviewDrawerProps {
  entry: EnrichedJournalEntry;
  onClose: () => void;
  onEdit: () => void;
  onRefresh: (data?: import("@/lib/journal/types").JournalTrackerData) => void;
}

function winVariant(winLoss: EnrichedJournalEntry["winLoss"]) {
  if (winLoss === "Win") return "success" as const;
  if (winLoss === "Loss") return "danger" as const;
  return "outline" as const;
}

function ReviewBlock({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <section>
      <p className="mb-1 text-[10px] uppercase tracking-wider text-terminal-muted">
        {label}
      </p>
      <p className="text-xs leading-relaxed text-terminal-text">{value}</p>
    </section>
  );
}

export function JournalReviewDrawer({
  entry,
  onClose,
  onEdit,
  onRefresh,
}: JournalReviewDrawerProps) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this journal entry permanently?")) return;
    setBusy(true);
    const result = await deleteJournalEntry(entry.id);
    setBusy(false);
    if (!result.success) {
      alert(result.error);
      return;
    }
    onRefresh(result.data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="h-full w-full max-w-lg overflow-y-auto border-l border-terminal-border bg-terminal-surface shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-terminal-border bg-terminal-surface px-4 py-3">
          <div>
            <h2 className="font-mono text-lg font-semibold text-terminal-text">
              {entry.ticker}
            </h2>
            <p className="text-xs text-terminal-muted">
              {entry.strategyLabel} · {entry.entryDate}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            {entry.winLoss ? (
              <Badge variant={winVariant(entry.winLoss)}>{entry.winLoss}</Badge>
            ) : (
              <Badge variant="outline">Open</Badge>
            )}
            {entry.tradeScore != null && (
              <Badge variant="info">Score {entry.tradeScore}</Badge>
            )}
            {entry.confidenceLevel && (
              <Badge variant="outline">{entry.confidenceLevel}</Badge>
            )}
          </div>

          {entry.tradeId && (
            <Link
              href={`/trades`}
              className="flex items-center gap-2 rounded border border-terminal-border px-3 py-2 text-xs text-accent hover:bg-terminal-elevated/50"
            >
              <Link2 className="h-3.5 w-3.5" />
              Linked to Options Trade — view in Trade Tracker
            </Link>
          )}

          <section>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-terminal-muted">
              Entry Setup
            </p>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-terminal-muted">DTE</dt>
                <dd className="font-mono">{entry.dte ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Contracts</dt>
                <dd className="font-mono">{entry.contracts ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Strikes</dt>
                <dd className="font-mono">
                  {entry.shortStrike != null && entry.longStrike != null
                    ? `${entry.shortStrike} / ${entry.longStrike}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Width</dt>
                <dd className="font-mono">{entry.width ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Credit</dt>
                <dd className="font-mono">
                  {entry.creditReceived != null
                    ? formatCurrency(entry.creditReceived)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Max Risk</dt>
                <dd className="font-mono">
                  {entry.maxRisk != null ? formatCurrency(entry.maxRisk) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Breakeven</dt>
                <dd className="font-mono">{entry.breakeven ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-terminal-muted">BP Used</dt>
                <dd className="font-mono">
                  {entry.buyingPowerUsed != null
                    ? formatCurrency(entry.buyingPowerUsed)
                    : "—"}
                </dd>
              </div>
            </dl>
            {entry.reasonForEntry && (
              <p className="mt-2 text-xs text-terminal-muted">
                {entry.reasonForEntry}
              </p>
            )}
            <ReviewBlock label="Setup Notes" value={entry.entrySetup} />
          </section>

          <section>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-terminal-muted">
              Exit Outcome
            </p>
            {entry.isClosed ? (
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-terminal-muted">Exit Date</dt>
                  <dd className="font-mono">{entry.exitDate}</dd>
                </div>
                <div>
                  <dt className="text-terminal-muted">Days Held</dt>
                  <dd className="font-mono">{entry.daysHeld}</dd>
                </div>
                <div>
                  <dt className="text-terminal-muted">Exit Debit</dt>
                  <dd className="font-mono">
                    {entry.exitDebit != null
                      ? formatCurrency(entry.exitDebit)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-terminal-muted">Exit Reason</dt>
                  <dd>{entry.exitReason ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-terminal-muted">Total Trade P/L</dt>
                  <dd
                    className={cn(
                      "font-mono",
                      (entry.totalTradeProfitLoss ?? 0) >= 0
                        ? "text-profit"
                        : "text-loss"
                    )}
                  >
                    {entry.totalTradeProfitLoss != null
                      ? formatSignedCurrency(entry.totalTradeProfitLoss)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-terminal-muted">My P/L</dt>
                  <dd
                    className={cn(
                      "font-mono",
                      (entry.myProfitLoss ?? 0) >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {entry.myProfitLoss != null
                      ? formatSignedCurrency(entry.myProfitLoss)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-terminal-muted">Client P/L</dt>
                  <dd
                    className={cn(
                      "font-mono",
                      (entry.clientProfitLoss ?? 0) >= 0
                        ? "text-profit"
                        : "text-loss"
                    )}
                  >
                    {entry.clientProfitLoss != null
                      ? formatSignedCurrency(entry.clientProfitLoss)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-terminal-muted">Return on Risk</dt>
                  <dd className="font-mono">
                    {entry.returnOnRiskPct != null
                      ? `${entry.returnOnRiskPct.toFixed(1)}%`
                      : "—"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-xs text-terminal-muted">Position still open</p>
            )}
            <ReviewBlock label="Outcome Notes" value={entry.exitOutcome} />
          </section>

          <ReviewBlock label="What Went Well" value={entry.whatWentWell} />
          <ReviewBlock label="What To Improve" value={entry.whatToImprove} />
          <ReviewBlock label="Lesson Learned" value={entry.lessonLearned} />

          <section>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-terminal-muted">
              Screenshot
            </p>
            {entry.screenshotUrl ? (
              <img
                src={entry.screenshotUrl}
                alt="Trade screenshot"
                className="max-h-48 rounded border border-terminal-border object-contain"
              />
            ) : (
              <div className="flex h-32 items-center justify-center rounded border border-dashed border-terminal-border text-xs text-terminal-muted">
                <ImageIcon className="mr-2 h-4 w-4" />
                Screenshot placeholder — add URL in edit form
              </div>
            )}
          </section>

          <ReviewBlock label="Notes" value={entry.reviewNotes} />

          <div className="flex flex-wrap gap-2 border-t border-terminal-border pt-4">
            <Button variant="ghost" size="sm" onClick={onEdit} disabled={busy}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-loss"
              disabled={busy}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
