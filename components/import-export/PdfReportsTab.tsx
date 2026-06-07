"use client";

import { useState, useTransition } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadPdfReport } from "@/app/actions/import-export";
import { PDF_REPORT_LABELS } from "@/lib/import-export/constants";
import type { PdfReportType } from "@/lib/import-export/types";
import { triggerFileDownload } from "./download";

const REPORTS: { type: PdfReportType; description: string }[] = [
  {
    type: "weekend_market_review",
    description:
      "Top opportunities, no-trade list, S/R notes, and weekend summary",
  },
  {
    type: "portfolio_report",
    description: "Portfolio value, allocation, performance, and goals progress",
  },
  {
    type: "trading_performance",
    description:
      "Win rate, profit factor, expectancy, best/worst trades, strategy breakdown",
  },
  {
    type: "risk_report",
    description: "Open risk, liquidity, trade eligibility, and stress test",
  },
];

export function PdfReportsTab() {
  const [isPending, startTransition] = useTransition();
  const [active, setActive] = useState<PdfReportType | null>(null);

  function handleExport(type: PdfReportType) {
    setActive(type);
    startTransition(async () => {
      const payload = await downloadPdfReport(type);
      triggerFileDownload(payload);
      setActive(null);
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {REPORTS.map((report) => (
        <div
          key={report.type}
          className="rounded-lg border border-terminal-border bg-terminal-elevated p-4 flex flex-col"
        >
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-terminal-text">
              {PDF_REPORT_LABELS[report.type]}
            </h3>
          </div>
          <p className="text-xs text-terminal-muted flex-1">
            {report.description}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3 w-fit"
            disabled={isPending}
            onClick={() => handleExport(report.type)}
          >
            {isPending && active === report.type
              ? "Generating PDF…"
              : "Download PDF"}
          </Button>
        </div>
      ))}
    </div>
  );
}
