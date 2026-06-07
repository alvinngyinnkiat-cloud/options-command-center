"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import type { ImportExportPageData, ImportExportTab } from "@/lib/import-export/types";
import { CsvImportTab } from "./CsvImportTab";
import { CsvExportTab } from "./CsvExportTab";
import { ExcelExportTab } from "./ExcelExportTab";
import { PdfReportsTab } from "./PdfReportsTab";
import { BackupRestoreTab } from "./BackupRestoreTab";

const TABS: { id: ImportExportTab; label: string }[] = [
  { id: "csv_import", label: "CSV Import" },
  { id: "csv_export", label: "CSV Export" },
  { id: "excel_export", label: "Excel Export" },
  { id: "pdf_reports", label: "PDF Reports" },
  { id: "backup_restore", label: "Backup & Restore" },
];

interface ImportExportClientProps {
  initialData: ImportExportPageData;
}

export function ImportExportClient({ initialData }: ImportExportClientProps) {
  const [activeTab, setActiveTab] = useState<ImportExportTab>("csv_import");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import / Export Center"
        description="Import portfolio and trade records, export reports for backup, analysis, and sharing"
        actions={
          <Badge
            variant={
              initialData.dataSource === "supabase" ? "success" : "outline"
            }
          >
            {initialData.dataSource === "supabase" ? "Live data" : "Mock data"}
          </Badge>
        }
      />

      <div className="rounded-lg border border-terminal-border bg-terminal-elevated/40 px-4 py-3 text-xs text-terminal-muted">
        Support/resistance values are manual only — exports preserve existing
        levels; imports never auto-generate S/R.
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-1 border-b border-terminal-border min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "text-accent border-b-2 border-accent -mb-px"
                  : "text-terminal-muted hover:text-terminal-text"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-terminal-border bg-terminal-sidebar p-4 sm:p-6">
        {activeTab === "csv_import" && <CsvImportTab />}
        {activeTab === "csv_export" && (
          <CsvExportTab exportCounts={initialData.exportCounts} />
        )}
        {activeTab === "excel_export" && <ExcelExportTab />}
        {activeTab === "pdf_reports" && <PdfReportsTab />}
        {activeTab === "backup_restore" && <BackupRestoreTab />}
      </div>
    </div>
  );
}
