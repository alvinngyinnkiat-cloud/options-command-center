"use client";

import { useState } from "react";
import {
  recordCryptoBuy,
  recordCryptoDeposit,
  recordCryptoMonthlyContribution,
  recordCryptoSell,
} from "@/app/actions/crypto";
import { Button } from "@/components/ui/Button";
import type { EnrichedCryptoHolding } from "@/lib/crypto/types";
import { formatSGD } from "@/lib/utils";
import { X } from "lucide-react";

const inputClass =
  "w-full rounded border border-terminal-border bg-terminal-elevated px-3 py-2 text-sm font-mono";

type ModalKind = "deposit" | "monthly_contribution" | "buy" | "sell";

interface CryptoTransactionModalsProps {
  kind: ModalKind | null;
  holding?: EnrichedCryptoHolding | null;
  availableCashSgd: number;
  onClose: () => void;
  onSaved: () => void;
}

export function CryptoTransactionModals({
  kind,
  holding,
  availableCashSgd,
  onClose,
  onSaved,
}: CryptoTransactionModalsProps) {
  if (!kind) return null;

  if (kind === "deposit" || kind === "monthly_contribution") {
    return (
      <CashInModal
        kind={kind}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }

  if (kind === "buy") {
    return (
      <BuyModal
        availableCashSgd={availableCashSgd}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }

  return (
    <SellModal
      holding={holding!}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function CashInModal({
  kind,
  onClose,
  onSaved,
}: {
  kind: "deposit" | "monthly_contribution";
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [transactionDate, setTransactionDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      transactionDate,
      amountSgd: parseFloat(amount) || 0,
      notes: notes.trim() || null,
    };
    const result =
      kind === "deposit"
        ? await recordCryptoDeposit(payload)
        : await recordCryptoMonthlyContribution(payload);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <ModalShell
      title={kind === "deposit" ? "Deposit Cash" : "Monthly Contribution"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <p className="text-xs text-terminal-muted">
          Increases Available Exchange Cash and Total Contributions.
        </p>
        <DateField value={transactionDate} onChange={setTransactionDate} />
        <AmountField value={amount} onChange={setAmount} label="Amount SGD" />
        <NotesField value={notes} onChange={setNotes} />
        {error && <p className="text-xs text-loss">{error}</p>}
        <ModalActions saving={saving} onClose={onClose} submitLabel="Save" />
      </form>
    </ModalShell>
  );
}

function BuyModal({
  availableCashSgd,
  onClose,
  onSaved,
}: {
  availableCashSgd: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [transactionDate, setTransactionDate] = useState(today);
  const [ticker, setTicker] = useState("");
  const [coinName, setCoinName] = useState("");
  const [buyAmount, setBuyAmount] = useState("");
  const [fee, setFee] = useState("0");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const buyNum = parseFloat(buyAmount) || 0;
  const feeNum = parseFloat(fee) || 0;
  const totalCost = buyNum + feeNum;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await recordCryptoBuy({
      transactionDate,
      ticker: ticker.toUpperCase(),
      coinName: coinName || ticker.toUpperCase(),
      buyAmountSgd: buyNum,
      feeSgd: feeNum,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <ModalShell title="Buy Coin" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <p className="text-xs text-terminal-muted">
          Available Exchange Cash: {formatSGD(availableCashSgd)}
        </p>
        <DateField value={transactionDate} onChange={setTransactionDate} />
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">Ticker</span>
            <input
              className={inputClass}
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">Coin Name</span>
            <input
              className={inputClass}
              value={coinName}
              onChange={(e) => setCoinName(e.target.value)}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <AmountField value={buyAmount} onChange={setBuyAmount} label="Buy Amount SGD" />
          <AmountField value={fee} onChange={setFee} label="Fee SGD" />
        </div>
        <p className="text-xs text-terminal-muted font-mono">
          Total cost: {formatSGD(totalCost)}
        </p>
        <NotesField value={notes} onChange={setNotes} />
        {error && <p className="text-xs text-loss">{error}</p>}
        <ModalActions saving={saving} onClose={onClose} submitLabel="Buy" />
      </form>
    </ModalShell>
  );
}

function SellModal({
  holding,
  onClose,
  onSaved,
}: {
  holding: EnrichedCryptoHolding;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [transactionDate, setTransactionDate] = useState(today);
  const [sellAmount, setSellAmount] = useState("");
  const [fee, setFee] = useState("0");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await recordCryptoSell({
      transactionDate,
      holdingId: holding.id,
      sellAmountSgd: parseFloat(sellAmount) || 0,
      feeSgd: parseFloat(fee) || 0,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <ModalShell title={`Sell ${holding.ticker}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <p className="text-xs text-terminal-muted">
          Current position value: {formatSGD(holding.currentValueSgd)}
        </p>
        <DateField value={transactionDate} onChange={setTransactionDate} />
        <AmountField value={sellAmount} onChange={setSellAmount} label="Sell Amount SGD" />
        <AmountField value={fee} onChange={setFee} label="Fee SGD" />
        <NotesField value={notes} onChange={setNotes} />
        {error && <p className="text-xs text-loss">{error}</p>}
        <ModalActions saving={saving} onClose={onClose} submitLabel="Sell" />
      </form>
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-terminal-border bg-terminal-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-terminal-border px-4 py-3">
          <h2 className="text-sm font-semibold text-terminal-text">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase text-terminal-muted">Date</span>
      <input
        type="date"
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </label>
  );
}

function AmountField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase text-terminal-muted">{label}</span>
      <input
        type="number"
        min="0"
        step="0.01"
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </label>
  );
}

function NotesField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase text-terminal-muted">Notes</span>
      <textarea
        className={`${inputClass} min-h-[60px]`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function ModalActions({
  saving,
  onClose,
  submitLabel,
}: {
  saving: boolean;
  onClose: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? "Saving…" : submitLabel}
      </Button>
    </div>
  );
}

export type { ModalKind };
