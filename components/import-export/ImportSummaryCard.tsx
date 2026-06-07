import type { ImportSummary } from "@/lib/import-export/types";
import { IMPORT_ENTITY_LABELS } from "@/lib/import-export/constants";

interface ImportSummaryCardProps {
  summary: ImportSummary;
}

export function ImportSummaryCard({ summary }: ImportSummaryCardProps) {
  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-elevated p-4 space-y-3">
      <h3 className="text-sm font-semibold text-terminal-text">
        Import Summary — {IMPORT_ENTITY_LABELS[summary.entityType]}
      </h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-semibold text-gain">{summary.imported}</p>
          <p className="text-[11px] text-terminal-muted">Imported</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-warn">{summary.skipped}</p>
          <p className="text-[11px] text-terminal-muted">Skipped</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-loss">
            {summary.errors.length}
          </p>
          <p className="text-[11px] text-terminal-muted">Errors</p>
        </div>
      </div>
      {summary.errors.length > 0 && (
        <ul className="text-xs text-loss space-y-1 max-h-32 overflow-y-auto">
          {summary.errors.map((e, i) => (
            <li key={i}>
              Row {e.row}: {e.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
