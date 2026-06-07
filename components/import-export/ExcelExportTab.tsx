"use client";

import { useTransition } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadExcelExport } from "@/app/actions/import-export";
import { triggerFileDownload } from "./download";

const SHEETS = [
  "Portfolio",
  "Options Trades",
  "Stock Tracker",
  "Crypto Tracker",
  "Trading Journal",
  "Scanner",
  "Risk Dashboard",
];

export function ExcelExportTab() {
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const payload = await downloadExcelExport();
      triggerFileDownload(payload);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-terminal-border bg-terminal-elevated p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/15 border border-accent/20">
            <FileSpreadsheet className="h-6 w-6 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-terminal-text">
              Full Workbook Export (XLSX)
            </h3>
            <p className="text-xs text-terminal-muted mt-1">
              Includes formatting, totals row, and autofilters on each sheet.
            </p>
            <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs text-terminal-muted">
              {SHEETS.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          </div>
        </div>
        <Button
          className="mt-4 gap-2"
          onClick={handleExport}
          disabled={isPending}
        >
          <FileSpreadsheet className="h-4 w-4" />
          {isPending ? "Generating…" : "Download Excel Workbook"}
        </Button>
      </div>
    </div>
  );
}
