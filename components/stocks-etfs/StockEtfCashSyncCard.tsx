"use client";

import { useEffect, useState } from "react";
import {
  getStockEtfCashSyncPreview,
  syncStockEtfCashFromPortfolio,
} from "@/app/actions/stock-etf-cash";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { formatSGD } from "@/lib/utils";
import { formatNativeValue } from "@/lib/portfolio/format-holdings";

interface StockEtfCashSyncCardProps {
  onSaved: () => void;
}

export function StockEtfCashSyncCard({ onSaved }: StockEtfCashSyncCardProps) {
  const [usEtf, setUsEtf] = useState("");
  const [usStock, setUsStock] = useState("");
  const [sgStock, setSgStock] = useState("");
  const [tradingCashUsd, setTradingCashUsd] = useState<number | null>(null);
  const [tradingCashSgd, setTradingCashSgd] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inputClass =
    "w-full h-9 rounded-md border border-terminal-border bg-terminal-surface px-3 font-mono text-sm";

  useEffect(() => {
    getStockEtfCashSyncPreview().then((preview) => {
      if ("error" in preview) return;
      setUsEtf(String(preview.usEtfCashUsd));
      setUsStock(String(preview.usStockCashUsd));
      setSgStock(String(preview.sgStockCashSgd));
      setTradingCashUsd(preview.tradingCashUsd);
      setTradingCashSgd(preview.tradingCashSgd);
    });
  }, []);

  async function handleSync() {
    setSaving(true);
    setError(null);
    const result = await syncStockEtfCashFromPortfolio({
      usEtfCashUsd: parseFloat(usEtf) || 0,
      usStockCashUsd: parseFloat(usStock) || 0,
      sgStockCashSgd: parseFloat(sgStock) || 0,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onSaved();
  }

  return (
    <Card variant="bordered">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Sync Trading Cash From Portfolio Dashboard</CardTitle>
        <CardDescription>
          Set per-market trading cash from the Portfolio Dashboard reference
          totals or your own amounts. Manual values here override stored
          balances when you sync.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(tradingCashUsd != null || tradingCashSgd != null) && (
          <div className="rounded-md border border-terminal-border/60 bg-terminal-elevated/30 px-3 py-2 text-xs space-y-1">
            <p className="text-terminal-muted uppercase tracking-wider text-[10px]">
              Portfolio Dashboard source
            </p>
            <p className="font-mono text-terminal-text">
              Trading Cash USD: {formatNativeValue(tradingCashUsd ?? 0, "USD")}
            </p>
            <p className="font-mono text-terminal-text">
              Trading Cash SGD: {formatSGD(tradingCashSgd ?? 0)}
            </p>
            <p className="text-[10px] text-terminal-muted">
              Reference only — allocate USD and SGD across markets manually.
              Stored balances prefill below.
            </p>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-xs">
            <span className="text-terminal-muted uppercase tracking-wider">
              US ETF Trading Cash (USD)
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={usEtf}
              onChange={(e) => setUsEtf(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-terminal-muted uppercase tracking-wider">
              US Stock Trading Cash (USD)
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={usStock}
              onChange={(e) => setUsStock(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-terminal-muted uppercase tracking-wider">
              SG Stock Trading Cash (SGD)
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={sgStock}
              onChange={(e) => setSgStock(e.target.value)}
            />
          </label>
        </div>
        <textarea
          className={`${inputClass} min-h-[56px]`}
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        {error && <p className="text-xs text-loss">{error}</p>}
        <Button variant="secondary" size="sm" disabled={saving} onClick={handleSync}>
          {saving ? "Syncing…" : "Sync Trading Cash From Portfolio Dashboard"}
        </Button>
      </CardContent>
    </Card>
  );
}
