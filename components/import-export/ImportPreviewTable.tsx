import type { ImportPreviewRow } from "@/lib/import-export/types";
import { cn } from "@/lib/utils";

interface ImportPreviewTableProps {
  headers: string[];
  rows: ImportPreviewRow[];
}

export function ImportPreviewTable({ headers, rows }: ImportPreviewTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-terminal-muted py-8 text-center">
        Upload a CSV file to preview records.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[700px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated">
            <th className="px-3 py-2 text-left font-medium text-terminal-muted">
              Row
            </th>
            <th className="px-3 py-2 text-left font-medium text-terminal-muted">
              Status
            </th>
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left font-medium text-terminal-muted"
              >
                {h}
              </th>
            ))}
            <th className="px-3 py-2 text-left font-medium text-terminal-muted">
              Errors
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.rowNumber}
              className={cn(
                "border-b border-terminal-border/50",
                !row.isValid && "bg-loss/5",
                row.isDuplicate && row.isValid && "bg-warn/5"
              )}
            >
              <td className="px-3 py-2 font-mono">{row.rowNumber}</td>
              <td className="px-3 py-2">
                {!row.isValid ? (
                  <span className="text-loss">Error</span>
                ) : row.isDuplicate ? (
                  <span className="text-warn">Duplicate</span>
                ) : (
                  <span className="text-gain">Ready</span>
                )}
              </td>
              {headers.map((h) => (
                <td key={h} className="px-3 py-2">
                  {row.data[h] ?? ""}
                </td>
              ))}
              <td className="px-3 py-2 text-loss">
                {row.errors.join("; ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
