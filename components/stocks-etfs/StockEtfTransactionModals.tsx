"use client";

import { useEffect, useMemo, useState } from "react";
import {
  recordStockEtfBuy,
  recordStockEtfDividend,
  recordStockEtfSell,
} from "@/app/actions/stock-etf-cash";
import { recordStockEtfFieldAdjustment } from "@/app/actions/stock-etf-positions";
import { Button } from "@/components/ui/Button";
import type { MarketCategory } from "@/lib/stocks-etfs/market-category";
import type { StockEtfFieldAdjusted } from "@/lib/stocks-etfs/position-types";
import type { EnrichedStockEtfHolding } from "@/lib/stocks-etfs/types";
import { DEFAULT_USD_SGD_RATE } from "@/lib/portfolio/currency";
import { formatNativeValue } from "@/lib/portfolio/format-holdings";
import { formatSGD } from "@/lib/utils";
import { X } from "lucide-react";

const inputClass =
  "w-full rounded border border-terminal-border bg-terminal-elevated px-3 py-2 text-sm font-mono";

export type StockEtfModalKind = "buy" | "sell" | "dividend" | "adjustment";

const ADJUSTMENT_FIELDS: { value: StockEtfFieldAdjusted; label: string }[] = [
  { value: "shares", label: "Share count" },
  { value: "capital_invested", label: "Capital invested" },
  { value: "current_value", label: "Current value" },
  { value: "dividend", label: "Total dividend" },
  { value: "fees", label: "Total fees" },
  { value: "pl", label: "P/L" },
];

interface StockEtfTransactionModalsProps {
  kind: StockEtfModalKind | null;
  defaultMarketCategory?: MarketCategory;
  holdings?: EnrichedStockEtfHolding[];
  onClose: () => void;
  onSaved: () => void;
}

export function StockEtfTransactionModals({
  kind,
  defaultMarketCategory = "us_etf",
  holdings = [],
  onClose,
  onSaved,
}: StockEtfTransactionModalsProps) {
  if (kind === "buy") {
    return (
      <TradeModal
        mode="buy"
        defaultMarketCategory={defaultMarketCategory}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }
  if (kind === "sell") {
    return (
      <TradeModal
        mode="sell"
        defaultMarketCategory={defaultMarketCategory}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }
  if (kind === "dividend") {
    return (
      <DividendModal
        defaultMarketCategory={defaultMarketCategory}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }
  if (kind === "adjustment") {
    return (
      <FieldAdjustmentModal
        holdings={holdings}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }
  return null;
}

function TradeModal({
  mode,
  defaultMarketCategory,
  onClose,
  onSaved,
}: {
  mode: "buy" | "sell";
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
  const grossAmount = sharesNum * priceNum;
  const netBuyCost = grossAmount + feeNum;
  const netSellProceeds = grossAmount - feeNum;
  const isUsMarket = marketCategory === "us_etf" || marketCategory === "us_stock";
  const currencyLabel = isUsMarket ? "USD" : "SGD";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      marketCategory,
      transactionDate,
      ticker: ticker.toUpperCase(),
      shares: sharesNum,
      pricePerShare: priceNum,
      fees: feeNum,
      fxRateToSgd: isUsMarket ? parseFloat(fxRate) || DEFAULT_USD_SGD_RATE : null,
      notes: notes.trim() || null,
    };

    const result =
      mode === "buy"
        ? await recordStockEtfBuy(payload)
        : await recordStockEtfSell(payload);

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
      title={mode === "buy" ? "Buy Stock / ETF" : "Sell Stock / ETF"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <p className="text-xs text-terminal-muted">
          {mode === "buy"
            ? "Record a buy — including past historical purchases. No trading cash validation."
            : "Record a sell. Blocked only if shares sold exceed shares held."}
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
          <AmountField
            label={mode === "buy" ? "Number of Shares" : "Shares Sold"}
            value={shares}
            onChange={setShares}
            step="any"
            min="0.0001"
          />
          <AmountField
            label={`Price per Share (${currencyLabel})`}
            value={pricePerShare}
            onChange={setPricePerShare}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <AmountField label={`Fees (${currencyLabel})`} value={fees} onChange={setFees} />
          {isUsMarket && (
            <AmountField label="FX Rate (SGD/USD)" value={fxRate} onChange={setFxRate} />
          )}
        </div>
        <p className="text-xs text-terminal-muted font-mono">
          {mode === "buy" ? (
            <>
              Gross:{" "}
              {isUsMarket
                ? formatNativeValue(grossAmount, "USD")
                : formatSGD(grossAmount)}{" "}
              · Total cost:{" "}
              {isUsMarket
                ? formatNativeValue(netBuyCost, "USD")
                : formatSGD(netBuyCost)}
            </>
          ) : (
            <>
              Gross:{" "}
              {isUsMarket
                ? formatNativeValue(grossAmount, "USD")
                : formatSGD(grossAmount)}{" "}
              · Net proceeds:{" "}
              {isUsMarket
                ? formatNativeValue(netSellProceeds, "USD")
                : formatSGD(netSellProceeds)}
            </>
          )}
        </p>
        <NotesField value={notes} onChange={setNotes} />
        {error && <p className="text-xs text-loss">{error}</p>}
        <ModalActions
          saving={saving}
          onClose={onClose}
          submitLabel={mode === "buy" ? "Save Buy" : "Save Sell"}
        />
      </form>
    </ModalShell>
  );
}

function DividendModal({
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
  const [paymentDate, setPaymentDate] = useState(today);
  const [ticker, setTicker] = useState("");
  const [dividendAmount, setDividendAmount] = useState("");
  const [fxRate, setFxRate] = useState(String(DEFAULT_USD_SGD_RATE));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isUsMarket = marketCategory === "us_etf" || marketCategory === "us_stock";
  const currencyLabel = isUsMarket ? "USD" : "SGD";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await recordStockEtfDividend({
      marketCategory,
      paymentDate,
      ticker: ticker.toUpperCase(),
      dividendAmount: parseFloat(dividendAmount) || 0,
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
    <ModalShell title="Record Dividend" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <p className="text-xs text-terminal-muted">
          Record a dividend payment. Saved to dividend history and included in
          P/L With Dividend.
        </p>
        <MarketField value={marketCategory} onChange={setMarketCategory} />
        <DateField label="Date" value={paymentDate} onChange={setPaymentDate} />
        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-terminal-muted">Ticker</span>
          <input
            className={inputClass}
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            required
          />
        </label>
        <AmountField
          label={`Dividend Amount (${currencyLabel})`}
          value={dividendAmount}
          onChange={setDividendAmount}
        />
        {isUsMarket && (
          <AmountField label="FX Rate (SGD/USD)" value={fxRate} onChange={setFxRate} />
        )}
        <NotesField value={notes} onChange={setNotes} />
        {error && <p className="text-xs text-loss">{error}</p>}
        <ModalActions saving={saving} onClose={onClose} submitLabel="Save Dividend" />
      </form>
    </ModalShell>
  );
}

function FieldAdjustmentModal({
  holdings,
  onClose,
  onSaved,
}: {
  holdings: EnrichedStockEtfHolding[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [adjustmentDate, setAdjustmentDate] = useState(today);
  const [ticker, setTicker] = useState("");
  const [field, setField] = useState<StockEtfFieldAdjusted>("shares");
  const [newValue, setNewValue] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const holding = useMemo(
    () => holdings.find((row) => row.ticker === ticker.toUpperCase()),
    [holdings, ticker]
  );

  const oldValue = useMemo(() => {
    if (!holding) return null;
    const capital = holding.totalInvestedNative;
    const current = holding.currentValueNative;
    switch (field) {
      case "shares":
        return holding.sharesHeld ?? 0;
      case "capital_invested":
        return capital;
      case "current_value":
        return current;
      case "dividend":
        return holding.manualTotalDividend;
      case "fees":
        return holding.manualTotalFees;
      case "pl":
        return current - capital;
    }
  }, [holding, field]);

  useEffect(() => {
    if (oldValue != null) {
      setNewValue(String(oldValue));
    }
  }, [oldValue, field, ticker]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await recordStockEtfFieldAdjustment({
      adjustmentDate,
      ticker: ticker.toUpperCase(),
      field,
      newValue: parseFloat(newValue) || 0,
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
    <ModalShell title="Manual Adjustment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <p className="text-xs text-terminal-muted">
          Correct share count, capital, current value, dividend, fees, or P/L.
          Use only when transaction history needs a correction.
        </p>
        <DateField
          label="Date"
          value={adjustmentDate}
          onChange={setAdjustmentDate}
        />
        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-terminal-muted">Ticker</span>
          <input
            className={inputClass}
            list="stock-etf-adjustment-tickers"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            required
          />
          <datalist id="stock-etf-adjustment-tickers">
            {holdings.map((row) => (
              <option key={row.id} value={row.ticker} />
            ))}
          </datalist>
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-terminal-muted">
            Field Adjusted
          </span>
          <select
            className={inputClass}
            value={field}
            onChange={(e) => setField(e.target.value as StockEtfFieldAdjusted)}
          >
            {ADJUSTMENT_FIELDS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-terminal-muted">Old Value</span>
          <input
            className={`${inputClass} opacity-70`}
            value={oldValue != null ? String(oldValue) : "—"}
            readOnly
            tabIndex={-1}
          />
        </label>
        <AmountField label="New Value" value={newValue} onChange={setNewValue} />
        <NotesField value={notes} onChange={setNotes} />
        {error && <p className="text-xs text-loss">{error}</p>}
        <ModalActions
          saving={saving}
          onClose={onClose}
          submitLabel="Save Adjustment"
        />
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
  label = "Date",
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase text-terminal-muted">{label}</span>
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
