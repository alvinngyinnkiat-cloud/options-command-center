"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import type {
  MonthlyContributionRecord,
  MonthlyContributionTrackerData,
} from "@/lib/contributions/types";
import { formatSGD } from "@/lib/utils";
import { PiggyBank, Plus } from "lucide-react";
import { MonthlyContributionChart } from "./MonthlyContributionChart";
import { MonthlyContributionFormModal } from "./MonthlyContributionFormModal";
import { MonthlyContributionsTable } from "./MonthlyContributionsTable";

interface MonthlyContributionTrackerPanelProps {
  initialData: MonthlyContributionTrackerData;
  onDataChange?: (data: MonthlyContributionTrackerData) => void;
}

export function MonthlyContributionTrackerPanel({
  initialData,
  onDataChange,
}: MonthlyContributionTrackerPanelProps) {
  const [data, setData] = useState(initialData);
  const [formContribution, setFormContribution] = useState<
    MonthlyContributionRecord | null | undefined
  >(undefined);

  function handleDataChange(next: MonthlyContributionTrackerData) {
    setData(next);
    onDataChange?.(next);
  }

  const { ytdBreakdown } = data;

  return (
    <div className="space-y-4">
      <Card variant="bordered">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 border border-accent/20">
                <PiggyBank className="h-4 w-4 text-accent" />
              </div>
              <div>
                <CardTitle>Monthly Contribution Tracker</CardTitle>
                <CardDescription>
                  Stocks &amp; Options and Crypto only — US ETF, US Stock, SG
                  Stock, options cash, and crypto deposits combined into two
                  buckets
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={data.dataSource === "supabase" ? "success" : "outline"}
              >
                {data.dataSource === "supabase" ? "Live data" : "Mock data"}
              </Badge>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setFormContribution(null)}
              >
                <Plus className="h-4 w-4" />
                Add Month
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
              YTD Summary ({data.currentYear})
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                label="Stocks & Options"
                value={formatSGD(ytdBreakdown.stockOptionsAmountSgd)}
                change={`${ytdBreakdown.stockOptionsPct.toFixed(1)}% of total`}
                changeType="neutral"
              />
              <StatCard
                label="Crypto"
                value={formatSGD(ytdBreakdown.cryptoAmountSgd)}
                change={`${ytdBreakdown.cryptoPct.toFixed(1)}% of total`}
                changeType="neutral"
              />
              <StatCard
                label="Total Contributions"
                value={formatSGD(ytdBreakdown.totalAmountSgd)}
                change={`Avg. ${formatSGD(data.averageMonthlyContribution)}/mo`}
                changeType="neutral"
              />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
              Monthly Entries
            </h3>
            <MonthlyContributionsTable
              contributions={data.contributions}
              onEdit={(c) => setFormContribution(c)}
              onDataChange={handleDataChange}
            />
          </div>
        </CardContent>
      </Card>

      <MonthlyContributionChart
        contributions={data.contributions}
        currentYear={data.currentYear}
      />

      {formContribution !== undefined && (
        <MonthlyContributionFormModal
          contribution={formContribution}
          defaultYear={data.currentYear}
          onClose={() => setFormContribution(undefined)}
          onSaved={handleDataChange}
        />
      )}
    </div>
  );
}
