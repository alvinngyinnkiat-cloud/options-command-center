"use client";

import { useState } from "react";
import { payClient } from "@/app/actions/client-profit-sharing";
import { Button } from "@/components/ui/Button";
import {
  DEFAULT_CLIENT_SHARE_PCT,
  DEFAULT_MY_SHARE_PCT,
} from "@/lib/client-profit-sharing/constants";
import { formFromClient } from "@/lib/client-profit-sharing/map-client";
import type { ClientProfile } from "@/lib/client-profit-sharing/types";
import { formatRiskCurrency } from "@/lib/risk/format";
import { Pencil } from "lucide-react";
import { ClientProfileFormModal } from "./ClientProfileFormModal";

interface ClientProfilePanelProps {
  clients: ClientProfile[];
  activeClientId: string | null;
  onRefresh: () => void;
}

export function ClientProfilePanel({
  clients,
  activeClientId,
  onRefresh,
}: ClientProfilePanelProps) {
  const [editing, setEditing] = useState<ClientProfile | null | undefined>(
    undefined
  );
  const [payAmount, setPayAmount] = useState("");
  const [paying, setPaying] = useState(false);

  const active = clients.find((c) => c.id === activeClientId) ?? clients[0];

  async function handlePayment() {
    if (!active) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;
    setPaying(true);
    const result = await payClient(active.id, amount);
    setPaying(false);
    if (!result.success) {
      alert(result.error);
      return;
    }
    setPayAmount("");
    onRefresh();
  }

  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Client Profile
        </h2>
        <Button variant="primary" size="sm" onClick={() => setEditing(null)}>
          Add Client
        </Button>
      </div>

      {clients.length === 0 ? (
        <p className="text-xs text-terminal-muted">No client sharing records yet.</p>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="rounded border border-terminal-border/60 px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-terminal-text">
                  {client.clientName}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(client)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="mt-1 text-terminal-muted">
                Capital {formatRiskCurrency(client.capitalContributed)} · Split{" "}
                {client.clientSharePct}% / {client.mySharePct}% · Paid{" "}
                {formatRiskCurrency(client.totalPaidToClient)}
              </p>
            </div>
          ))}
        </div>
      )}

      {active && (
        <div className="flex flex-wrap items-end gap-2 border-t border-terminal-border pt-3">
          <label className="space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">
              Record Payment to {active.clientName}
            </span>
            <input
              type="number"
              className="rounded border border-terminal-border bg-terminal-elevated px-3 py-2 font-mono text-sm"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="Amount"
            />
          </label>
          <Button
            variant="secondary"
            size="sm"
            disabled={paying}
            onClick={handlePayment}
          >
            {paying ? "Saving…" : "Record Payment"}
          </Button>
        </div>
      )}

      {editing !== undefined && (
        <ClientProfileFormModal
          client={editing}
          onClose={() => setEditing(undefined)}
          onSaved={onRefresh}
        />
      )}

      <p className="text-[10px] text-terminal-muted">
        Default split: {DEFAULT_CLIENT_SHARE_PCT}% client / {DEFAULT_MY_SHARE_PCT}%
        my share
      </p>
    </div>
  );
}
