"use client";

import { formatDisplayDate } from "@/lib/format/datetime";
import { SOURCE_TYPE_LABELS, SENTIMENT_LABELS } from "@/lib/market-intelligence/constants";
import type {
  IntelligenceDocument,
  IntelligenceSummary,
} from "@/lib/market-intelligence/types";

interface IntelligenceDocumentsTableProps {
  documents: IntelligenceDocument[];
  summaries: IntelligenceSummary[];
  onDelete: (id: string) => void;
  isPending: boolean;
}

export function IntelligenceDocumentsTable({
  documents,
  summaries,
  onDelete,
  isPending,
}: IntelligenceDocumentsTableProps) {
  const summaryByDoc = new Map(summaries.map((s) => [s.documentId, s]));

  if (documents.length === 0) {
    return (
      <p className="text-sm text-terminal-muted py-6 text-center">
        No documents uploaded yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-terminal-border">
      <table className="w-full min-w-[800px] text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-elevated">
            <th className="px-3 py-2 text-left">Title</th>
            <th className="px-3 py-2 text-left">Source</th>
            <th className="px-3 py-2 text-left">Sentiment</th>
            <th className="px-3 py-2 text-left">Takeaways</th>
            <th className="px-3 py-2 text-left">Uploaded</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const summary = summaryByDoc.get(doc.id);
            return (
              <tr
                key={doc.id}
                className="border-b border-terminal-border/50 align-top"
              >
                <td className="px-3 py-2 font-medium">{doc.title}</td>
                <td className="px-3 py-2">
                  {SOURCE_TYPE_LABELS[doc.sourceType]}
                </td>
                <td className="px-3 py-2">
                  {summary
                    ? SENTIMENT_LABELS[summary.overallSentiment]
                    : "—"}
                </td>
                <td className="px-3 py-2 text-terminal-muted max-w-xs">
                  {summary?.keyTakeaways.slice(0, 2).join(" · ") ?? "—"}
                </td>
                <td className="px-3 py-2 text-terminal-muted">
                  {formatDisplayDate(doc.uploadedAt)}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onDelete(doc.id)}
                    className="text-loss hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
