"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadCsvExport } from "@/app/actions/import-export";
import { CSV_EXPORT_LABELS } from "@/lib/import-export/constants";
import type { CsvExportEntity, ImportExportPageData } from "@/lib/import-export/types";
import { triggerFileDownload } from "./download";

interface CsvExportTabProps {
  exportCounts: ImportExportPageData["exportCounts"];
}

const ENTITIES: CsvExportEntity[] = [
  "portfolio_holdings",
  "options_trades",
  "crypto",
  "watchlist",
  "scanner_results",
  "trading_journal",
  "risk_dashboard",
  "reports",
];

export function CsvExportTab({ exportCounts }: CsvExportTabProps) {
  const [isPending, startTransition] = useTransition();

  function handleExport(entity: CsvExportEntity) {
    startTransition(async () => {
      const payload = await downloadCsvExport(entity);
      triggerFileDownload(payload);
    });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {ENTITIES.map((entity) => (
        <button
          key={entity}
          type="button"
          disabled={isPending}
          onClick={() => handleExport(entity)}
          className="flex items-center justify-between rounded-lg border border-terminal-border bg-terminal-elevated px-4 py-3 text-left hover:border-accent/40 hover:bg-terminal-sidebar transition-colors disabled:opacity-50"
        >
          <div>
            <p className="text-sm font-medium text-terminal-text">
              {CSV_EXPORT_LABELS[entity]}
            </p>
            <p className="text-[11px] text-terminal-muted mt-0.5">
              {exportCounts[entity]} records
            </p>
          </div>
          <Download className="h-4 w-4 text-terminal-muted shrink-0" />
        </button>
      ))}
    </div>
  );
}
