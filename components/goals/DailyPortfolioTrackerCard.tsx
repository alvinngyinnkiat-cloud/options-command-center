"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { CreateSnapshotButton } from "@/components/portfolio/CreateSnapshotButton";
import type { PortfolioHistoryData } from "@/lib/portfolio/daily-snapshot-types";
import { formatSGD } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface DailyPortfolioTrackerCardProps {
  history: PortfolioHistoryData;
  onHistoryChange: (history: PortfolioHistoryData) => void;
}

export function DailyPortfolioTrackerCard({
  history,
  onHistoryChange,
}: DailyPortfolioTrackerCardProps) {
  const latest = history.latest;
  const perf = history.performance;

  return (
    <Card variant="bordered">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-accent/20 bg-accent/15">
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            <div>
              <CardTitle>Daily Portfolio Value Tracker</CardTitle>
              <CardDescription>
                My Portfolio Value only — client capital tracked separately
              </CardDescription>
            </div>
          </div>
          <CreateSnapshotButton onUpdated={onHistoryChange} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              My Portfolio Value
            </p>
            <p className="font-mono text-2xl font-semibold text-terminal-text">
              {latest?.portfolioValueSgd != null
                ? formatSGD(latest.portfolioValueSgd)
                : "—"}
            </p>
            {latest?.snapshotDate && (
              <p className="text-[11px] text-terminal-muted">
                {latest.snapshotDate}
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Client Current Value
            </p>
            <p className="font-mono text-xl font-semibold text-terminal-text">
              {latest?.clientCurrentValueSgd != null
                ? formatSGD(latest.clientCurrentValueSgd)
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Total Assets Managed
            </p>
            <p className="font-mono text-xl font-semibold text-terminal-text">
              {latest?.totalAssetsManagedSgd != null
                ? formatSGD(latest.totalAssetsManagedSgd)
                : "—"}
            </p>
            <p className="text-[10px] text-terminal-muted">Informational only</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Daily Change
            </p>
            <p
              className={`font-mono text-lg font-medium ${
                perf.dailyChange == null
                  ? "text-terminal-muted"
                  : perf.dailyChange >= 0
                    ? "text-profit"
                    : "text-loss"
              }`}
            >
              {perf.dailyChange != null
                ? `${perf.dailyChange >= 0 ? "+" : ""}${formatSGD(perf.dailyChange)}`
                : "—"}
            </p>
            {perf.dailyChangePct != null && (
              <p className="text-[11px] text-terminal-muted">
                {perf.dailyChangePct >= 0 ? "+" : ""}
                {perf.dailyChangePct.toFixed(2)}%
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
