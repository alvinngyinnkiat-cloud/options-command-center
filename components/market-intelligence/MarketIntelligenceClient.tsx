"use client";

import { useState, useTransition } from "react";
import {
  deleteIntelligenceDocument,
  uploadIntelligenceDocument,
} from "@/app/actions/market-intelligence";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { COMBINED_WEIGHTS } from "@/lib/market-intelligence/constants";
import type { MarketIntelligencePageData } from "@/lib/market-intelligence/types";
import { DocumentUploadPanel } from "./DocumentUploadPanel";
import { IntelligenceDocumentsTable } from "./IntelligenceDocumentsTable";
import { IntelligenceSummaryPanel } from "./IntelligenceSummaryPanel";
import { OptionsDecisionAssistant } from "./OptionsDecisionAssistant";
import { WatchlistImpactTable } from "./WatchlistImpactTable";

interface MarketIntelligenceClientProps {
  initialData: MarketIntelligencePageData;
}

export function MarketIntelligenceClient({
  initialData,
}: MarketIntelligenceClientProps) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const latestSummary = data.summaries[0] ?? null;

  function handleUpload(input: {
    title: string;
    sourceType: MarketIntelligencePageData["documents"][0]["sourceType"];
    rawText: string;
    fileName?: string;
  }) {
    setError(null);
    startTransition(async () => {
      const result = await uploadIntelligenceDocument(input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setData(result.data);
    });
  }

  function handleDelete(documentId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteIntelligenceDocument(documentId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setData(result.data);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Intelligence Center"
        description="Upload research and commentary — augments the technical scanner at 25% weight"
        actions={
          <Badge
            variant={data.dataSource === "supabase" ? "success" : "outline"}
          >
            {data.dataSource === "supabase" ? "Live data" : "Mock data"}
          </Badge>
        }
      />

      <div className="rounded-lg border border-terminal-border bg-terminal-elevated/40 px-4 py-3 text-xs text-terminal-muted">
        Technical scanner remains primary ({COMBINED_WEIGHTS.technical * 100}%
        weight) · Market intelligence contributes {COMBINED_WEIGHTS.intelligence * 100}%
        · Support/resistance remain manual only — intelligence never modifies S/R
      </div>

      {error && (
        <p className="text-sm text-loss rounded-md border border-loss/30 bg-loss/5 px-3 py-2">
          {error}
        </p>
      )}

      <DocumentUploadPanel onUpload={handleUpload} isPending={isPending} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-terminal-text">
            Uploaded Documents
          </h3>
          <IntelligenceDocumentsTable
            documents={data.documents}
            summaries={data.summaries}
            onDelete={handleDelete}
            isPending={isPending}
          />
        </div>
        <IntelligenceSummaryPanel summary={latestSummary} />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-terminal-text">
          Watchlist Impact
        </h3>
        <WatchlistImpactTable impacts={data.aggregatedImpacts} />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-terminal-text">
          Options Decision Assistant
        </h3>
        <OptionsDecisionAssistant rows={data.decisionAssistant} />
      </div>
    </div>
  );
}
