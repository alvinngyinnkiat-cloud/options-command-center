"use client";

import { useMemo, useState } from "react";
import {
  recordStockEtfBuy,
  recordStockEtfMonthlyContribution,
} from "@/app/actions/stock-etf-cash";
import { Button } from "@/components/ui/Button";
import { categoryLabel } from "@/lib/stocks-etfs/market-category";
import type { MarketCategory } from "@/lib/stocks-etfs/market-category";
import { DEFAULT_USD_SGD_RATE } from "@/lib/portfolio/currency";
import { formatNativeValue } from "@/lib/portfolio/format-holdings";
import { formatSGD } from "@/lib/utils";
import { X } from "lucide-react";

const inputClass =
  "w-full rounded border border-terminal-border bg-terminal-elevated px-3 py-2 text-sm font-mono";

export type StockEtfModalKind = "monthly_contribution" | "buy";

interface StockEtfTransactionModalsProps {
  kind: StockEtfModalKind | null;
  cashBalances: Record<MarketCategory, number>;
  defaultMarketCategory?: MarketCategory;
  onClose: () => void;
  onSaved: () => void;
}

export function StockEtfTransactionModals({
  kind,
  cashBalances,
  defaultMarketCategory = "us_etf",
  onClose,
  onSaved,
}: StockEtfTransactionModalsProps) {
  if (!kind) return null;

  if (kind === "monthly_contribution") {
    return (
      <ContributionModal
        defaultMarketCategory={defaultMarketCategory}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }

  return (
    <BuyModal
      cashBalances={cashBalances}
      defaultMarketCategory={defaultMarketCategory}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function ContributionModal({
  defaultMarketCategory,
  onClose,
  onSaved,
}: {
  defaultMarketCategory: MarketCategory;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [marketCategory, setMarketCategory] =
    useState<MarketCategory>(defaultMarketCategory);
  const [transactionDate, setTransactionDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [inputCurrency, setInputCurrency] = useState<"native" | "SGD">("native");
  const [fxRate, setFxRate] = useState(String(DEFAULT_USD_SGD_RATE));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isUsMarket = marketCategory === "us_etf" || marketCategory === "us_stock";
  const nativeLabel = isUsMarket ? "USD" : "SGD";

  const amountNative = useMemo(() => {
    const raw = parseFloat(amount) || 0;
    if (!isUsMarket || inputCurrency === "native") return raw;
    const rate = parseFloat(fxRate) || DEFAULT_USD_SGD_RATE;
    return rate > 0 ? raw / rate : 0;
  }, [amount, fxRate, inputCurrency, isUsMarket]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await recordStockEtfMonthlyContribution({
      marketCategory,
      transactionDate,
      amountNative,
      fxRateToSgd:
        isUsMarket && inputCurrency === "SGD"
          ? parseFloat(fxRate) || DEFAULT_USD_SGD_RATE
          : null,
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
    <ModalShell title="Monthly Contribution" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <p className="text-xs text-terminal-muted">
          Increases market cash balance. Does not change holdings until you record
          a buy.
        </p>
        <MarketField value={marketCategory} onChange={setMarketCategory} />
        <DateField value={transactionDate} onChange={setTransactionDate} />
        {isUsMarket && (
          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-terminal-muted">
              Enter amount in
            </span>
            <select
              className={inputClass}
              value={inputCurrency}
              onChange={(e) =>
                setInputCurrency(e.target.value as "native" | "SGD")
              }
            >
              <option value="native">USD</option>
              <option value="SGD">SGD (convert via FX)</option>
            </select>
          </label>
        )}
        <AmountField
          label={`Amount ${inputCurrency === "SGD" && isUsMarket ? "SGD" : nativeLabel}`}
          value={amount}
          onChange={setAmount}
        />
        {isUsMarket && inputCurrency === "SGD" && (
          <AmountField label="FX Rate (SGD per USD)" value={fxRate} onChange={setFxRate} />
        )}
        {isUsMarket && inputCurrency === "SGD" && (
          <p className="text-xs text-terminal-muted font-mono">
            ≈ {formatNativeValue(amountNative, "USD")} credited to cash
          </p>
        )}
        <NotesField value={notes} onChange={setNotes} />
        {error && <p className="text-xs text-loss">{error}</p>}
        <ModalActions saving={saving} onClose={onClose} submitLabel="Save" />
      </form>
    </ModalShell>
  );
}

function BuyModal({
  cashBalances,
  defaultMarketCategory,
  onClose,
  onSaved,
}: {
  cashBalances: Record<MarketCategory, number>;
  defaultMarketCategory: MarketCategory;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [marketCategory, setMarketCategory] =
    useState<MarketCategory>(defaultMarketCategory);
  const [transactionDate, setTransactionDate] = useState(today);
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [pricePerShare, setPricePerShare] = useState("");
  const [fees, setFees] = useState("0");
  const [fxRate, setFxRate] = useState(String(DEFAULT_USD_SGD_RATE));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sharesNum = parseFloat(shares) || 0;
  const priceNum = parseFloat(pricePerShare) || 0;
  const feeNum = parseFloat(fees) || 0;
  const totalAmount = sharesNum * priceNum;
  const totalCost = totalAmount + feeNum;
  const isUsMarket = marketCategory === "us_etf" || marketCategory === "us_stock";
  const availableCash = cashBalances[marketCategory];
  const currencyLabel = isUsMarket ? "USD" : "SGD";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await recordStockEtfBuy({
      marketCategory,
      transactionDate,
      ticker: ticker.toUpperCase(),
      shares: sharesNum,
      pricePerShare: priceNum,
      fees: feeNum,
      fxRateToSgd: isUsMarket ? parseFloat(fxRate) || DEFAULT_USD_SGD_RATE : null,
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
    <ModalShell title="Buy Stock / ETF" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <p className="text-xs text-terminal-muted">
          {categoryLabel(marketCategory)} cash:{" "}
          {isUsMarket
            ? formatNativeValue(availableCash, "USD")
            : formatSGD(availableCash)}
        </p>
        <MarketField value={marketCategory} onChange={setMarketCategory} />
        <DateField value={transactionDate} onChange={setTransactionDate} />
        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-terminal-muted">Ticker</span>
          <input
            className={inputClass}
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <AmountField label="Shares" value={shares} onChange={setShares} step="any" min="0.0001" />
          <AmountField
            label={`Buy Price (${currencyLabel})`}
            value={pricePerShare}
            onChange={setPricePerShare}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <AmountField label={`Fee (${currencyLabel})`} value={fees} onChange={setFees} />
          {isUsMarket && (
            <AmountField label="FX Rate (SGD/USD)" value={fxRate} onChange={setFxRate} />
          )}
        </div>
        <p className="text-xs text-terminal-muted font-mono">
          Total buy:{" "}
          {isUsMarket
            ? formatNativeValue(totalAmount, "USD")
            : formatSGD(totalAmount)}{" "}
          · Total cost incl. fee:{" "}
          {isUsMarket
            ? formatNativeValue(totalCost, "USD")
            : formatSGD(totalCost)}
        </p>
        <NotesField value={notes} onChange={setNotes} />
        {error && <p className="text-xs text-loss">{error}</p>}
        <ModalActions saving={saving} onClose={onClose} submitLabel="Buy" />
      </form>
    </ModalShell>
  );
}

function MarketField({
  value,
  onChange,
}: {
  value: MarketCategory;
  onChange: (v: MarketCategory) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase text-terminal-muted">Market Type</span>
      <select
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value as MarketCategory)}
      >
        <option value="us_etf">US ETF</option>
        <option value="us_stock">US Stock</option>
        <option value="sg_stock">SG Stock</option>
      </select>
    </label>
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
      <div className="w-full max-w-md rounded-lg border border-terminal-border bg-terminal-surface shadow-xl max-h-[90vh] overflow-y-auto">
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
  min = "0",
  step = "0.01",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  step?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase text-terminal-muted">{label}</span>
      <input
        type="number"
        min={min}
        step={step}
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
