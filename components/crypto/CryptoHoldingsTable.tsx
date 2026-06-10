"use client";

import { useMemo, useState } from "react";
import { deleteCryptoHolding, updateCryptoHolding } from "@/app/actions/crypto";
import { Button } from "@/components/ui/Button";
import { PnlPercentValue, PnlValue } from "@/components/ui/PnlValue";
import { buildCryptoHoldingMetrics } from "@/lib/crypto/calculations";
import { CRYPTO_ASSET_OPTIONS } from "@/lib/crypto/constants";
import {
  cryptoHoldingFormFromEnriched,
  prepareCryptoHoldingFormForSave,
} from "@/lib/crypto/map-holding";
import type {
  CryptoAssetLabel,
  CryptoHoldingFormInput,
  EnrichedCryptoHolding,
} from "@/lib/crypto/types";
import { formatSGD } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

interface CryptoHoldingsTableProps {
  holdings: EnrichedCryptoHolding[];
  variant: "open" | "closed";
  onEdit?: (holding: EnrichedCryptoHolding) => void;
  onRefresh: () => void;
  emptyMessage: string;
}

const inputClass =
  "w-full min-w-0 rounded border border-terminal-border bg-terminal-elevated px-1.5 py-1 text-xs font-mono";

export function CryptoHoldingsTable({
  holdings,
  variant,
  onEdit,
  onRefresh,
  emptyMessage,
}: CryptoHoldingsTableProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CryptoHoldingFormInput | null>(null);
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
    if (editingId === id) {
      setEditingId(null);
      setEditForm(null);
    }
    onRefresh();
  }

  function startEdit(h: EnrichedCryptoHolding) {
    if (isOpen && onEdit) {
      onEdit(h);
      return;
    }
    setEditingId(h.id);
    setEditForm(cryptoHoldingFormFromEnriched(h));
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
    setEditError(null);
  }

  function patchEditForm(patch: Partial<CryptoHoldingFormInput>) {
    setEditForm((f) => (f ? { ...f, ...patch } : f));
  }

  function handleAssetChange(label: CryptoAssetLabel) {
    if (!editForm) return;
    const opt = CRYPTO_ASSET_OPTIONS.find((o) => o.value === label);
    patchEditForm({
      assetLabel: label,
      ticker: label === "Other" ? editForm.ticker : (opt?.defaultTicker ?? label),
    });
  }

  async function handleSave(h: EnrichedCryptoHolding) {
    if (!editForm) return;
    setSavingId(h.id);
    setEditError(null);
    const payload = prepareCryptoHoldingFormForSave(editForm, h.lastUpdated);
    const result = await updateCryptoHolding(h.id, payload, h.createdAt);
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

  const showActions = isOpen ? Boolean(onEdit) : true;

  return (
    <>
      {editError && (
        <p className="mb-2 text-xs text-loss">{editError}</p>
      )}

      {/* Mobile — card layout */}
      <div className="space-y-3 md:hidden">
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
            <article
              key={h.id}
              className="rounded-lg border border-terminal-border bg-terminal-surface p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                {editing ? (
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <label className="space-y-0.5">
                      <span className="text-[10px] uppercase text-terminal-muted">
                        Asset
                      </span>
                      <select
                        className={inputClass}
                        value={editForm.assetLabel}
                        onChange={(e) =>
                          handleAssetChange(e.target.value as CryptoAssetLabel)
                        }
                      >
                        {CRYPTO_ASSET_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-[10px] uppercase text-terminal-muted">
                        Ticker
                      </span>
                      <input
                        className={inputClass}
                        value={editForm.ticker}
                        onChange={(e) =>
                          patchEditForm({ ticker: e.target.value.toUpperCase() })
                        }
                        disabled={editForm.assetLabel !== "Other"}
                      />
                    </label>
                  </div>
                ) : (
                  <div>
                    <p className="font-mono text-sm font-semibold text-accent">
                      {h.ticker}
                    </p>
                    <p className="text-xs text-terminal-muted">{h.assetLabel}</p>
                  </div>
                )}
                {showActions && (
                  <ActionButtons
                    editing={Boolean(editing)}
                    saving={savingId === h.id}
                    removing={removingId === h.id}
                    onEdit={() => startEdit(h)}
                    onSave={() => handleSave(h)}
                    onCancel={cancelEdit}
                    onDelete={() => handleDelete(h.id)}
                    ticker={h.ticker}
                  />
                )}
              </div>

              {editing ? (
                <ClosedEditFields
                  form={editForm}
                  preview={preview}
                  onChange={patchEditForm}
                />
              ) : (
                <ReadOnlyFields h={h} isOpen={isOpen} />
              )}
            </article>
          );
        })}
      </div>

      {/* Desktop — full table */}
      <div className="hidden md:block rounded-lg border border-terminal-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-terminal-border bg-terminal-elevated/80 text-left uppercase tracking-wider text-terminal-muted">
              <th className="px-3 py-2.5 font-medium">Asset</th>
              <th className="px-3 py-2.5 font-medium">Ticker</th>
              <th className="px-3 py-2.5 font-medium text-right">Invested SGD</th>
              <th className="px-3 py-2.5 font-medium text-right">Current SGD</th>
              <th className="px-3 py-2.5 font-medium text-right">P/L SGD</th>
              <th className="px-3 py-2.5 font-medium text-right">Return %</th>
              {isOpen && (
                <th className="px-3 py-2.5 font-medium text-right">Alloc %</th>
              )}
              {isOpen ? (
                <th className="px-3 py-2.5 font-medium">Last Updated</th>
              ) : (
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
                  <td className="px-3 py-2.5">
                    {editing ? (
                      <select
                        className={inputClass}
                        value={editForm.assetLabel}
                        onChange={(e) =>
                          handleAssetChange(e.target.value as CryptoAssetLabel)
                        }
                      >
                        {CRYPTO_ASSET_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.value}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-medium text-terminal-text">
                        {h.assetLabel}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {editing ? (
                      <input
                        className={inputClass}
                        value={editForm.ticker}
                        onChange={(e) =>
                          patchEditForm({ ticker: e.target.value.toUpperCase() })
                        }
                        disabled={editForm.assetLabel !== "Other"}
                      />
                    ) : (
                      <span className="font-mono font-semibold text-accent">
                        {h.ticker}
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
                  {isOpen && (
                    <td className="px-3 py-2.5 font-mono text-right text-terminal-muted tabular-nums">
                      {h.allocationPct.toFixed(1)}%
                    </td>
                  )}
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
                  <td className="px-3 py-2.5 text-terminal-muted max-w-[200px] whitespace-normal break-words">
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
                      <ActionButtons
                        editing={Boolean(editing)}
                        saving={savingId === h.id}
                        removing={removingId === h.id}
                        onEdit={() => startEdit(h)}
                        onSave={() => handleSave(h)}
                        onCancel={cancelEdit}
                        onDelete={() => handleDelete(h.id)}
                        ticker={h.ticker}
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

function ActionButtons({
  editing,
  saving,
  removing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  ticker,
}: {
  editing: boolean;
  saving: boolean;
  removing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  ticker: string;
}) {
  if (editing) {
    return (
      <div className="flex flex-wrap gap-1 shrink-0">
        <Button
          variant="primary"
          size="sm"
          disabled={saving}
          onClick={onSave}
        >
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
      <Button
        variant="ghost"
        size="sm"
        onClick={onEdit}
        aria-label={`Edit ${ticker}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
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

function ClosedEditFields({
  form,
  preview,
  onChange,
}: {
  form: CryptoHoldingFormInput;
  preview: { profitLossSgd: number; returnPct: number };
  onChange: (patch: Partial<CryptoHoldingFormInput>) => void;
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
      <label className="space-y-0.5">
        <span className="text-[10px] uppercase text-terminal-muted">
          Invested SGD
        </span>
        <input
          type="number"
          min={0}
          step="0.01"
          className={inputClass}
          value={form.totalInvestedSgd}
          onChange={(e) =>
            onChange({ totalInvestedSgd: parseFloat(e.target.value) || 0 })
          }
        />
      </label>
      <label className="space-y-0.5">
        <span className="text-[10px] uppercase text-terminal-muted">
          Current SGD
        </span>
        <input
          type="number"
          min={0}
          step="0.01"
          className={inputClass}
          value={form.currentValueSgd}
          onChange={(e) =>
            onChange({ currentValueSgd: parseFloat(e.target.value) || 0 })
          }
        />
      </label>
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
      <label className="space-y-0.5 col-span-2">
        <span className="text-[10px] uppercase text-terminal-muted">
          Closed Date
        </span>
        <input
          type="date"
          className={inputClass}
          value={form.lastUpdated ?? ""}
          onChange={(e) => onChange({ lastUpdated: e.target.value })}
        />
      </label>
      <label className="space-y-0.5 col-span-2">
        <span className="text-[10px] uppercase text-terminal-muted">Notes</span>
        <textarea
          className={`${inputClass} min-h-[48px]`}
          value={form.notes ?? ""}
          onChange={(e) => onChange({ notes: e.target.value || null })}
        />
      </label>
    </dl>
  );
}

function ReadOnlyFields({
  h,
  isOpen,
}: {
  h: EnrichedCryptoHolding;
  isOpen: boolean;
}) {
  return (
    <>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <Field label="Invested SGD" value={formatSGD(h.totalInvestedSgd)} />
        <Field label="Current SGD" value={formatSGD(h.currentValueSgd)} />
        <div>
          <dt className="text-terminal-muted">P/L SGD</dt>
          <dd className="font-mono tabular-nums">
            <PnlValue value={h.profitLossSgd} currency="SGD" />
          </dd>
        </div>
        <div>
          <dt className="text-terminal-muted">Return %</dt>
          <dd className="font-mono tabular-nums">
            <PnlPercentValue value={h.returnPct} />
          </dd>
        </div>
        {isOpen ? (
          <>
            <Field
              label="Allocation %"
              value={`${h.allocationPct.toFixed(1)}%`}
            />
            <Field label="Last Updated" value={h.lastUpdated} />
          </>
        ) : (
          <Field label="Closed Date" value={h.lastUpdated} />
        )}
      </dl>
      {h.notes && (
        <p className="text-xs text-terminal-muted break-words">{h.notes}</p>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-terminal-muted">{label}</dt>
      <dd className="font-mono text-terminal-text tabular-nums break-words">
        {value}
      </dd>
    </div>
  );
}
