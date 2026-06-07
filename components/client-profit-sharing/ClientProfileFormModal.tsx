"use client";

import { useState } from "react";
import { saveClientProfile } from "@/app/actions/client-profit-sharing";
import { Button } from "@/components/ui/Button";
import {
  DEFAULT_CLIENT_SHARE_PCT,
  DEFAULT_MY_SHARE_PCT,
} from "@/lib/client-profit-sharing/constants";
import {
  defaultClientForm,
  formFromClient,
} from "@/lib/client-profit-sharing/map-client";
import type { ClientProfile } from "@/lib/client-profit-sharing/types";
import { X } from "lucide-react";

interface ClientProfileFormModalProps {
  client?: ClientProfile | null;
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  "w-full rounded border border-terminal-border bg-terminal-elevated px-3 py-2 text-sm";

export function ClientProfileFormModal({
  client,
  onClose,
  onSaved,
}: ClientProfileFormModalProps) {
  const isEdit = Boolean(client);
  const [form, setForm] = useState(
    client ? formFromClient(client) : defaultClientForm()
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setClientShare(pct: number) {
    setForm((f) => ({
      ...f,
      clientSharePct: pct,
      mySharePct: 100 - pct,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName.trim()) {
      setError("Client name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await saveClientProfile(
      form,
      client?.id,
      client?.totalPaidToClient,
      client?.createdAt
    );
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-terminal-border bg-terminal-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {isEdit ? "Edit Client" : "Add Client"}
          </h2>
          <button type="button" onClick={onClose}>
            <X className="h-4 w-4 text-terminal-muted" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">Client Name</span>
            <input
              className={inputClass}
              value={form.clientName}
              onChange={(e) =>
                setForm((f) => ({ ...f, clientName: e.target.value }))
              }
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">
              Capital Contributed ($)
            </span>
            <input
              type="number"
              className={inputClass}
              value={form.capitalContributed || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  capitalContributed: parseFloat(e.target.value) || 0,
                }))
              }
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">
                Client Share %
              </span>
              <input
                type="number"
                className={inputClass}
                value={form.clientSharePct}
                onChange={(e) => setClientShare(parseFloat(e.target.value) || 0)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase text-terminal-muted">
                My Share %
              </span>
              <input
                type="number"
                className={inputClass}
                value={form.mySharePct}
                readOnly
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">Notes</span>
            <textarea
              className={`${inputClass} min-h-[60px]`}
              value={form.notes ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value.trim() || null }))
              }
            />
          </label>
          {error && <p className="text-xs text-loss">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Update" : "Add"}
            </Button>
          </div>
        </form>
        <p className="mt-2 text-[10px] text-terminal-muted">
          Default: {DEFAULT_CLIENT_SHARE_PCT}% / {DEFAULT_MY_SHARE_PCT}%
        </p>
      </div>
    </div>
  );
}
