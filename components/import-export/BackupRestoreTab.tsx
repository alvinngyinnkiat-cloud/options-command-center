"use client";

import { useState, useTransition } from "react";
import { Archive, Upload, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  downloadFullBackup,
  restoreFullBackup,
} from "@/app/actions/import-export";
import { triggerFileDownload } from "./download";

export function BackupRestoreTab() {
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleExportBackup() {
    startTransition(async () => {
      const payload = await downloadFullBackup();
      triggerFileDownload(payload);
      setMessage("Full backup downloaded successfully.");
      setIsError(false);
    });
  }

  function handleRestore(file: File | null) {
    if (!file) return;
    setMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      startTransition(async () => {
        const result = await restoreFullBackup(text);
        setMessage(result.message);
        setIsError(!result.success);
        if (result.success) {
          window.location.reload();
        }
      });
    };
    reader.readAsText(file);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-lg border border-terminal-border bg-terminal-elevated p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-accent" />
          <h3 className="text-sm font-semibold text-terminal-text">
            Export Full Backup
          </h3>
        </div>
        <p className="text-xs text-terminal-muted">
          JSON backup includes portfolio, watchlists, support/resistance (manual
          values only), trades, journal, settings, and goals.
        </p>
        <ul className="text-xs text-terminal-muted space-y-1">
          <li>· Portfolio holdings & overrides</li>
          <li>· Watchlist & S/R levels (exported as-is, never modified)</li>
          <li>· Options trades & trading journal</li>
          <li>· Crypto, stock/ETF, goals & risk settings</li>
          <li>· Weekend review snapshots & scanner results</li>
        </ul>
        <Button
          onClick={handleExportBackup}
          disabled={isPending}
          className="gap-2"
        >
          <Archive className="h-4 w-4" />
          {isPending ? "Exporting…" : "Download JSON Backup"}
        </Button>
      </div>

      <div className="rounded-lg border border-terminal-border bg-terminal-elevated p-5 space-y-4">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-warn" />
          <h3 className="text-sm font-semibold text-terminal-text">
            Restore Backup
          </h3>
        </div>
        <p className="text-xs text-terminal-muted">
          Import a previously exported JSON backup. This replaces mock-mode data
          for portfolio, trades, watchlist S/R, and related records.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-terminal-border bg-terminal-sidebar px-3 py-2 text-sm text-terminal-text hover:bg-terminal-elevated transition-colors">
          <Upload className="h-4 w-4" />
          Upload Backup JSON
          <input
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => handleRestore(e.target.files?.[0] ?? null)}
          />
        </label>
        {message && (
          <p
            className={`text-sm rounded-md px-3 py-2 ${
              isError
                ? "text-loss border border-loss/30 bg-loss/5"
                : "text-gain border border-gain/30 bg-gain/5"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
