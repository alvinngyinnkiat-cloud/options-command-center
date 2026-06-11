"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { MetricCardsGrid } from "@/components/ui/MetricCardsGrid";
import { StatCard } from "@/components/ui/StatCard";
import {
  buildContributionYearOptions,
  calculateYtdBreakdown,
} from "@/lib/contributions/calculations";
import type {
  MonthlyContributionRecord,
  MonthlyContributionTrackerData,
} from "@/lib/contributions/types";
import { formatSGD } from "@/lib/utils";
import { Plus } from "lucide-react";
import { MonthlyContributionChart } from "./MonthlyContributionChart";
import { MonthlyContributionFormModal } from "./MonthlyContributionFormModal";
import { MonthlyContributionsTable } from "./MonthlyContributionsTable";

interface MonthlyContributionTrackerPanelProps {
  initialData: MonthlyContributionTrackerData;
  onDataChange?: (data: MonthlyContributionTrackerData) => void;
}

const yearSelectClass =
  "h-9 rounded-md border border-terminal-border bg-terminal-surface px-2 font-mono text-sm text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50";

export function MonthlyContributionTrackerPanel({
  initialData,
  onDataChange,
}: MonthlyContributionTrackerPanelProps) {
  const [data, setData] = useState(initialData);
  const [selectedYear, setSelectedYear] = useState(initialData.currentYear);
  const [formContribution, setFormContribution] = useState<
    MonthlyContributionRecord | null | undefined
  >(undefined);

  const yearOptions = useMemo(
    () => buildContributionYearOptions(data.contributions, data.currentYear),
    [data.contributions, data.currentYear]
  );

  const yearBreakdown = useMemo(
    () => calculateYtdBreakdown(data.contributions, selectedYear),
    [data.contributions, selectedYear]
  );

  const yearContributions = useMemo(
    () => data.contributions.filter((c) => c.contributionYear === selectedYear),
    [data.contributions, selectedYear]
  );

  function handleDataChange(next: MonthlyContributionTrackerData) {
    setData(next);
    onDataChange?.(next);
  }

  return (
    <div className="space-y-4">
      <Card variant="bordered">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Monthly Contribution Tracker</CardTitle>
                <Badge
                  variant={data.dataSource === "supabase" ? "success" : "outline"}
                >
                  {data.dataSource === "supabase" ? "Live data" : "Mock data"}
                </Badge>
              </div>
              <CardDescription className="mt-1">
                Performance tracking and deployment planning reference — not
                broker cash accounting
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <label className="flex items-center gap-2 text-xs text-terminal-muted">
                <span className="uppercase tracking-wider whitespace-nowrap">
                  Year:
                </span>
                <select
                  className={yearSelectClass}
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  aria-label="Contribution year"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
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
          <MetricCardsGrid>
            <StatCard
              label="Stocks & Options Contribution"
              value={formatSGD(yearBreakdown.stockOptionsAmountSgd)}
            />
            <StatCard
              label="Crypto Contribution"
              value={formatSGD(yearBreakdown.cryptoAmountSgd)}
            />
            <StatCard
              label="Total Contribution YTD"
              value={formatSGD(yearBreakdown.totalAmountSgd)}
            />
            <StatCard
              label="Total Contribution"
              value={formatSGD(data.allTimeContributions)}
            />
          </MetricCardsGrid>

          <div>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
              Monthly Entries ({selectedYear})
            </h3>
            <MonthlyContributionsTable
              contributions={yearContributions}
              emptyMessage={`No contributions recorded for ${selectedYear}.`}
              onEdit={(c) => setFormContribution(c)}
              onDataChange={handleDataChange}
            />
          </div>
        </CardContent>
      </Card>

      <MonthlyContributionChart
        contributions={data.contributions}
        currentYear={selectedYear}
      />

      {formContribution !== undefined && (
        <MonthlyContributionFormModal
          contribution={formContribution}
          defaultYear={selectedYear}
          onClose={() => setFormContribution(undefined)}
          onSaved={handleDataChange}
        />
      )}
    </div>
  );
}
