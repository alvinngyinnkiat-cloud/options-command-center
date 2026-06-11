"use client";

import { useMemo, useState } from "react";
import {
  applyCryptoManualAdjustment,
  deleteCryptoHolding,
} from "@/app/actions/crypto";
import { Button } from "@/components/ui/Button";
import { PnlPercentValue, PnlValue } from "@/components/ui/PnlValue";
import { buildCryptoHoldingMetrics } from "@/lib/crypto/calculations";
import {
  cryptoHoldingFormFromEnriched,
  prepareCryptoHoldingFormForSave,
} from "@/lib/crypto/map-holding";
import type { CryptoHoldingFormInput, EnrichedCryptoHolding } from "@/lib/crypto/types";
import { formatSGD } from "@/lib/utils";
import { Pencil, Trash2, TrendingDown } from "lucide-react";

interface CryptoHoldingsTableProps {
  holdings: EnrichedCryptoHolding[];
  variant: "open" | "closed";
  onAdjust?: (holding: EnrichedCryptoHolding) => void;
  onSell?: (holding: EnrichedCryptoHolding) => void;
  onRefresh: () => void;
  emptyMessage: string;
}

const inputClass =
  "w-full min-w-0 rounded border border-terminal-border bg-terminal-elevated px-1.5 py-1 text-xs font-mono";

export function CryptoHoldingsTable({
  holdings,
  variant,
  onAdjust,
  onSell,
  onRefresh,
  emptyMessage,
}: CryptoHoldingsTableProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CryptoHoldingFormInput | null>(null);
  const [coinName, setCoinName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const isOpen = variant === "open";

  const editPreview = useMemo(() => {
    if (!editForm) return null;
    return buildCryptoHoldingMetrics(
      editForm.totalInvestedSgd,
      editForm.currentValueSgd,
      editForm.currentValueSgd
    );
  }, [editForm]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this crypto holding?")) return;
    setRemovingId(id);
    await deleteCryptoHolding(id);
    setRemovingId(null);
    cancelEdit();
    onRefresh();
  }

  function startEdit(h: EnrichedCryptoHolding) {
    if (isOpen && onAdjust) {
      onAdjust(h);
      return;
    }
    setEditingId(h.id);
    setEditForm(cryptoHoldingFormFromEnriched(h));
    setCoinName(h.assetLabel);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
    setCoinName("");
    setEditError(null);
  }

  function patchEditForm(patch: Partial<CryptoHoldingFormInput>) {
    setEditForm((f) => (f ? { ...f, ...patch } : f));
  }

  async function handleSave(h: EnrichedCryptoHolding) {
    if (!editForm) return;
    setSavingId(h.id);
    setEditError(null);
    const payload = prepareCryptoHoldingFormForSave(editForm, h.lastUpdated);
    const result = await applyCryptoManualAdjustment({
      transactionDate: payload.lastUpdated ?? h.lastUpdated,
      holdingId: h.id,
      ticker: payload.ticker,
      coinName: coinName || payload.ticker,
      totalInvestedSgd: payload.totalInvestedSgd,
      currentValueSgd: payload.currentValueSgd,
      notes: payload.notes,
    });
    setSavingId(null);
    if (!result.success) {
      setEditError(result.error);
      return;
    }
    cancelEdit();
    onRefresh();
  }

  if (holdings.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-terminal-border px-4 py-8 text-center text-sm text-terminal-muted">
        {emptyMessage}
      </p>
    );
  }

  const showActions = isOpen ? Boolean(onAdjust || onSell) : true;

  return (
    <>
      {editError && <p className="mb-2 text-xs text-loss">{editError}</p>}

      <div className="space-y-3 md:hidden">
        {holdings.map((h) => (
          <MobileRow
            key={h.id}
            h={h}
            isOpen={isOpen}
            editing={!isOpen && editingId === h.id && editForm != null}
            editForm={editForm}
            editPreview={editPreview}
            showActions={showActions}
            saving={savingId === h.id}
            removing={removingId === h.id}
            onStartEdit={() => startEdit(h)}
            onSave={() => handleSave(h)}
            onCancel={cancelEdit}
            onDelete={() => handleDelete(h.id)}
            onSell={onSell ? () => onSell(h) : undefined}
            onPatch={patchEditForm}
          />
        ))}
      </div>

      <div className="hidden md:block rounded-lg border border-terminal-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
              <th className="px-3 py-2.5 font-medium">Ticker</th>
              <th className="px-3 py-2.5 font-medium text-right">Invested SGD</th>
              <th className="px-3 py-2.5 font-medium text-right">Current SGD</th>
              <th className="px-3 py-2.5 font-medium text-right">P/L SGD</th>
              <th className="px-3 py-2.5 font-medium text-right">Return %</th>
              {!isOpen && (
                <th className="px-3 py-2.5 font-medium">Closed Date</th>
              )}
              <th className="px-3 py-2.5 font-medium">Notes</th>
              {showActions && (
                <th className="px-3 py-2.5 font-medium">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const editing = !isOpen && editingId === h.id && editForm;
              const preview =
                editing && editPreview
                  ? editPreview
                  : {
                      profitLossSgd: h.profitLossSgd,
                      returnPct: h.returnPct,
                    };

              return (
                <tr
                  key={h.id}
                  className="border-b border-terminal-border/50 hover:bg-terminal-elevated/40"
                >
                  <td className="px-3 py-2.5 font-mono font-semibold text-accent">
                    {editing ? (
                      <input
                        className={inputClass}
                        value={editForm.ticker}
                        onChange={(e) =>
                          patchEditForm({ ticker: e.target.value.toUpperCase() })
                        }
                      />
                    ) : (
                      h.ticker
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {editing ? (
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className={`${inputClass} text-right`}
                        value={editForm.totalInvestedSgd}
                        onChange={(e) =>
                          patchEditForm({
                            totalInvestedSgd: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    ) : (
                      <span className="font-mono text-terminal-muted tabular-nums">
                        {formatSGD(h.totalInvestedSgd)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {editing ? (
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className={`${inputClass} text-right`}
                        value={editForm.currentValueSgd}
                        onChange={(e) =>
                          patchEditForm({
                            currentValueSgd: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    ) : (
                      <span className="font-mono text-terminal-text tabular-nums">
                        {formatSGD(h.currentValueSgd)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-right font-medium tabular-nums">
                    <PnlValue value={preview.profitLossSgd} currency="SGD" />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-right tabular-nums">
                    <PnlPercentValue value={preview.returnPct} />
                  </td>
                  {!isOpen && (
                    <td className="px-3 py-2.5 text-terminal-muted whitespace-nowrap">
                      {editing ? (
                        <input
                          type="date"
                          className={inputClass}
                          value={editForm.lastUpdated ?? h.lastUpdated}
                          onChange={(e) =>
                            patchEditForm({ lastUpdated: e.target.value })
                          }
                        />
                      ) : (
                        h.lastUpdated
                      )}
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-terminal-muted max-w-[200px] break-words">
                    {editing ? (
                      <textarea
                        className={`${inputClass} min-h-[48px]`}
                        value={editForm.notes ?? ""}
                        onChange={(e) =>
                          patchEditForm({ notes: e.target.value || null })
                        }
                      />
                    ) : (
                      h.notes ?? "—"
                    )}
                  </td>
                  {showActions && (
                    <td className="px-3 py-2.5">
                      <RowActions
                        editing={Boolean(editing)}
                        saving={savingId === h.id}
                        removing={removingId === h.id}
                        ticker={h.ticker}
                        showSell={isOpen && Boolean(onSell)}
                        onEdit={() => startEdit(h)}
                        onSave={() => handleSave(h)}
                        onCancel={cancelEdit}
                        onDelete={() => handleDelete(h.id)}
                        onSell={onSell ? () => onSell(h) : undefined}
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MobileRow({
  h,
  isOpen,
  editing,
  editForm,
  editPreview,
  showActions,
  saving,
  removing,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
  onSell,
  onPatch,
}: {
  h: EnrichedCryptoHolding;
  isOpen: boolean;
  editing: boolean;
  editForm: CryptoHoldingFormInput | null;
  editPreview: ReturnType<typeof buildCryptoHoldingMetrics> | null;
  showActions: boolean;
  saving: boolean;
  removing: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onSell?: () => void;
  onPatch: (patch: Partial<CryptoHoldingFormInput>) => void;
}) {
  const preview = editing && editPreview
    ? editPreview
    : { profitLossSgd: h.profitLossSgd, returnPct: h.returnPct };

  return (
    <article className="rounded-lg border border-terminal-border bg-terminal-surface p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-sm font-semibold text-accent">{h.ticker}</p>
        {showActions && (
          <RowActions
            editing={editing}
            saving={saving}
            removing={removing}
            ticker={h.ticker}
            showSell={isOpen && Boolean(onSell)}
            onEdit={onStartEdit}
            onSave={onSave}
            onCancel={onCancel}
            onDelete={onDelete}
            onSell={onSell}
          />
        )}
      </div>
      {editing && editForm ? (
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <label className="space-y-0.5 col-span-2">
            <span className="text-[10px] uppercase text-terminal-muted">Ticker</span>
            <input
              className={inputClass}
              value={editForm.ticker}
              onChange={(e) => onPatch({ ticker: e.target.value.toUpperCase() })}
            />
          </label>
          <label className="space-y-0.5">
            <span className="text-[10px] uppercase text-terminal-muted">Invested SGD</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={editForm.totalInvestedSgd}
              onChange={(e) =>
                onPatch({ totalInvestedSgd: parseFloat(e.target.value) || 0 })
              }
            />
          </label>
          <label className="space-y-0.5">
            <span className="text-[10px] uppercase text-terminal-muted">Current SGD</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={editForm.currentValueSgd}
              onChange={(e) =>
                onPatch({ currentValueSgd: parseFloat(e.target.value) || 0 })
              }
            />
          </label>
        </dl>
      ) : (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <Field label="Invested SGD" value={formatSGD(h.totalInvestedSgd)} />
          <Field label="Current SGD" value={formatSGD(h.currentValueSgd)} />
          <div>
            <dt className="text-terminal-muted">P/L SGD</dt>
            <dd className="font-mono tabular-nums">
              <PnlValue value={preview.profitLossSgd} currency="SGD" />
            </dd>
          </div>
          <div>
            <dt className="text-terminal-muted">Return %</dt>
            <dd className="font-mono tabular-nums">
              <PnlPercentValue value={preview.returnPct} />
            </dd>
          </div>
          {!isOpen && <Field label="Closed Date" value={h.lastUpdated} />}
        </dl>
      )}
      {!editing && h.notes && (
        <p className="text-xs text-terminal-muted break-words">{h.notes}</p>
      )}
    </article>
  );
}

function RowActions({
  editing,
  saving,
  removing,
  ticker,
  showSell,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onSell,
}: {
  editing: boolean;
  saving: boolean;
  removing: boolean;
  ticker: string;
  showSell?: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onSell?: () => void;
}) {
  if (editing) {
    return (
      <div className="flex flex-wrap gap-1 shrink-0">
        <Button variant="primary" size="sm" disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" size="sm" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-loss"
          disabled={saving || removing}
          onClick={onDelete}
          aria-label={`Delete ${ticker}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-1 shrink-0">
      <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${ticker}`}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      {showSell && onSell && (
        <Button variant="ghost" size="sm" onClick={onSell} aria-label={`Sell ${ticker}`}>
          <TrendingDown className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="text-loss"
        disabled={removing}
        onClick={onDelete}
        aria-label={`Delete ${ticker}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-terminal-muted">{label}</dt>
      <dd className="font-mono text-terminal-text tabular-nums break-words">{value}</dd>
    </div>
  );
}
