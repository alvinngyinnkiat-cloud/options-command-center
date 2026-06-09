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
import { MetricCardsGrid } from "@/components/ui/MetricCardsGrid";
import { StatCard } from "@/components/ui/StatCard";
import {
  formatCagr,
  formatGoalDateDisplay,
  formatProgressPercent,
  formatSGD,
} from "@/lib/goals/format";
import type {
  GoalsDashboardData,
  PassiveIncomeGoalMetrics,
} from "@/lib/goals/types";
import { DEFAULT_ASSUMED_YIELD_PCT } from "@/lib/goals/types";
import { cn } from "@/lib/utils";
import { GoalProgressCard } from "./GoalProgressCard";

interface PassiveIncomeGoalPanelProps {
  data: GoalsDashboardData;
  passiveMetrics: PassiveIncomeGoalMetrics;
  yieldPct: number;
  onYieldChange: (yieldPct: number) => void;
  incomeGoalName?: string;
  incomeTarget?: number;
}

export function PassiveIncomeGoalPanel({
  data,
  passiveMetrics,
  yieldPct,
  onYieldChange,
  incomeGoalName = "Monthly Passive Income",
  incomeTarget,
}: PassiveIncomeGoalPanelProps) {
  const [yieldDraftOverride, setYieldDraftOverride] = useState<string | null>(
    null
  );
  const draftYield = yieldDraftOverride ?? String(yieldPct);

  const passiveProgress = {
    label: "Passive Income Goal",
    current: data.raw.passiveIncomeCurrent,
    target: data.raw.passiveIncomeTarget,
    progressPercent: passiveMetrics.progressPercent,
    estimatedCompletion: passiveMetrics.estimatedCompletion,
  };

  function applyYield() {
    const parsed = parseFloat(draftYield);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
      onYieldChange(parsed);
      setYieldDraftOverride(null);
    }
  }

  function resetYield() {
    onYieldChange(DEFAULT_ASSUMED_YIELD_PCT);
    setYieldDraftOverride(null);
  }

  const pct = Math.min(100, passiveMetrics.progressPercent);

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
        Passive Income Goal
      </h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GoalProgressCard
          title={incomeGoalName}
          description={`Target ${formatSGD(incomeTarget ?? passiveMetrics.targetMonthly)}/month from live passive income`}
          progress={passiveProgress}
          currentLabel="Current Income"
          targetLabel="Target Income"
        />

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Yield Assumption</CardTitle>
            <CardDescription>
              Required portfolio size updates with yield
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label
                  htmlFor="yield-input"
                  className="text-[10px] uppercase tracking-wider text-terminal-muted"
                >
                  Assumed Annual Yield %
                </label>
                <input
                  id="yield-input"
                  type="number"
                  min={0.5}
                  max={20}
                  step={0.1}
                  value={draftYield}
                  onChange={(e) => setYieldDraftOverride(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-terminal-border bg-terminal-surface px-3 font-mono text-sm text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50"
                />
              </div>
              <Button variant="primary" size="sm" onClick={applyYield}>
                Apply
              </Button>
              <Button variant="ghost" size="sm" onClick={resetYield}>
                Reset
              </Button>
            </div>
            <p className="text-xs text-terminal-muted">
              At <span className="font-mono text-accent">{yieldPct}%</span>{" "}
              annual yield, you need{" "}
              <span className="font-mono text-terminal-text">
                {formatSGD(passiveMetrics.requiredPortfolioSize)}
              </span>{" "}
              to generate {formatSGD(passiveMetrics.targetMonthly)}/month.
            </p>
          </CardContent>
        </Card>
      </div>

      <MetricCardsGrid gap="lg">
        <StatCard
          label="Required Portfolio"
          value={formatSGD(passiveMetrics.requiredPortfolioSize)}
          change={`At ${formatCagr(yieldPct)} yield`}
          changeType="neutral"
        />
        <StatCard
          label="Current Income"
          value={`${formatSGD(passiveMetrics.currentMonthly)}/mo`}
          change={formatProgressPercent(passiveMetrics.progressPercent)}
          changeType={
            passiveMetrics.progressPercent >= 50 ? "positive" : "neutral"
          }
        />
        <StatCard
          label="Income Gap"
          value={formatSGD(
            Math.max(
              0,
              passiveMetrics.targetMonthly - passiveMetrics.currentMonthly
            )
          )}
          change="Remaining per month"
          changeType="neutral"
        />
        <StatCard
          label="Est. Completion"
          value={
            passiveMetrics.estimatedCompletion
              ? formatGoalDateDisplay(passiveMetrics.estimatedCompletion)
              : "—"
          }
          change="Portfolio reaches required size"
          changeType="neutral"
        />
      </MetricCardsGrid>

      <Card variant="default">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Income Progress</CardTitle>
            <Badge variant="outline">{formatProgressPercent(pct)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-2 w-full overflow-hidden rounded-full bg-terminal-border">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                pct >= 100 ? "bg-profit" : "bg-warning"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
