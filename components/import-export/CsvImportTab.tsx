"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import { Upload, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  confirmImport,
  previewImportCsv,
} from "@/app/actions/import-export";
import { IMPORT_ENTITY_LABELS } from "@/lib/import-export/constants";
import type {
  ImportEntityType,
  ImportPreviewResult,
  ImportSummary,
} from "@/lib/import-export/types";
import { ImportPreviewTable } from "./ImportPreviewTable";
import { ImportSummaryCard } from "./ImportSummaryCard";

const IMPORT_TYPES: ImportEntityType[] = [
  "portfolio_holdings",
  "options_trades",
  "crypto",
  "watchlist",
];

export function CsvImportTab() {
  const [entityType, setEntityType] =
    useState<ImportEntityType>("portfolio_holdings");
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(file: File | null) {
    if (!file) return;
    setSummary(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      startTransition(async () => {
        try {
          const result = await previewImportCsv(entityType, text);
          setPreview(result);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to parse CSV");
          setPreview(null);
        }
      });
    };
    reader.readAsText(file);
  }

  function handleConfirm() {
    if (!preview) return;
    startTransition(async () => {
      try {
        const result = await confirmImport(entityType, preview.rows, true);
        setSummary(result);
        setPreview(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import failed");
      }
    });
  }

  function downloadTemplate() {
    const templates: Record<ImportEntityType, string[][]> = {
      portfolio_holdings: [
        ["Ticker", "Asset Type", "Currency", "Shares", "Cost Basis", "Current Value"],
        ["AAPL", "stock", "USD", "100", "15000", "17500"],
      ],
      options_trades: [
        [
          "Underlying",
          "Strategy",
          "Entry Date",
          "Expiry Date",
          "Contracts",
          "Strikes",
          "Premium",
          "Max Risk",
          "Status",
        ],
        [
          "SPY",
          "Iron Condor",
          "2026-05-20",
          "2026-06-24",
          "2",
          "505/500|535/540",
          "3.2",
          "1360",
          "open",
        ],
      ],
      crypto: [
        ["Ticker", "Invested Amount SGD", "Current Value SGD"],
        ["BTC", "12000", "15520"],
      ],
      watchlist: [
        ["Ticker", "Support1", "Support2", "Resistance1", "Resistance2", "Notes"],
        ["SPY", "505", "498", "535", "542", "Weekly range"],
      ],
    };
    const csv = Papa.unparse(templates[entityType]);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entityType}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label className="block text-xs text-terminal-muted mb-1.5">
            Import Type
          </label>
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value as ImportEntityType);
              setPreview(null);
              setSummary(null);
            }}
            className="w-full sm:w-64 rounded-md border border-terminal-border bg-terminal-elevated px-3 py-2 text-sm text-terminal-text"
          >
            {IMPORT_TYPES.map((t) => (
              <option key={t} value={t}>
                {IMPORT_ENTITY_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={downloadTemplate}>
            Download Template
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-terminal-border bg-terminal-elevated px-3 py-2 text-sm text-terminal-text hover:bg-terminal-sidebar transition-colors">
            <Upload className="h-4 w-4" />
            Upload CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      {error && (
        <p className="text-sm text-loss rounded-md border border-loss/30 bg-loss/5 px-3 py-2">
          {error}
        </p>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-gain">
              {preview.validCount} ready to import
            </span>
            <span className="text-warn">
              {preview.duplicateCount} duplicates (will skip)
            </span>
            <span className="text-loss">{preview.errorCount} errors</span>
          </div>
          <ImportPreviewTable headers={preview.headers} rows={preview.rows} />
          <Button
            onClick={handleConfirm}
            disabled={isPending || preview.validCount === 0}
            className="gap-2"
          >
            <FileCheck className="h-4 w-4" />
            {isPending ? "Importing…" : `Import ${preview.validCount} Records`}
          </Button>
        </div>
      )}

      {summary && <ImportSummaryCard summary={summary} />}
    </div>
  );
}
