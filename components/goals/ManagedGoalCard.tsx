"use client";

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  formatGoalDateDisplay,
  formatProgressPercent,
  formatSGD,
} from "@/lib/goals/format";
import type { ManagedFinancialGoal } from "@/lib/goals/types";
import { cn } from "@/lib/utils";
import { Archive, Pencil, RotateCcw, Trash2 } from "lucide-react";

interface ManagedGoalCardProps {
  goal: ManagedFinancialGoal;
  onEdit: (goal: ManagedFinancialGoal) => void;
  onArchive?: (goal: ManagedFinancialGoal) => void;
  onRestore?: (goal: ManagedFinancialGoal) => void;
  onDelete?: (goal: ManagedFinancialGoal) => void;
}

function formatAmount(value: number, monthly: boolean): string {
  const formatted = formatSGD(value);
  return monthly ? `${formatted}/mo` : formatted;
}

export function ManagedGoalCard({
  goal,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: ManagedGoalCardProps) {
  const pct = Math.min(100, goal.progressPercent);

  return (
    <Card variant="default" className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate">{goal.name}</CardTitle>
            <CardDescription>{goal.categoryLabel}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 gap-1 text-[11px]"
            onClick={() => onEdit(goal)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {goal.notes && (
          <p className="text-[11px] text-terminal-muted line-clamp-2">
            {goal.notes}
          </p>
        )}

        {goal.calculationSource && (
          <p className="text-[10px] text-terminal-muted leading-snug break-words">
            {goal.calculationSource}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Current
            </p>
            <p className="font-mono text-lg font-semibold">
              {formatAmount(goal.currentValue, goal.isMonthlyTarget)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Target
            </p>
            <p className="font-mono text-base text-terminal-muted">
              {formatAmount(goal.targetAmount, goal.isMonthlyTarget)}
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-terminal-muted">Progress</span>
            <span
              className={cn(
                "font-mono font-semibold",
                pct >= 100 ? "text-profit" : "text-accent"
              )}
            >
              {formatProgressPercent(goal.progressPercent)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-terminal-border">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                pct >= 100 ? "bg-profit" : "bg-accent"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-[10px] uppercase text-terminal-muted">
              Remaining
            </p>
            <p className="font-mono">
              {formatAmount(goal.remainingAmount, goal.isMonthlyTarget)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-terminal-muted">
              Days Left
            </p>
            <p className="font-mono">
              {goal.daysRemaining != null ? goal.daysRemaining : "—"}
            </p>
          </div>
        </div>

        {goal.projectedCompletionDate && !goal.isCompleted && (
          <p className="text-[11px] text-terminal-muted">
            Projected:{" "}
            <span className="font-mono text-terminal-text">
              {formatGoalDateDisplay(goal.projectedCompletionDate)}
            </span>
          </p>
        )}

        {(onArchive || onRestore || onDelete) && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-terminal-border/50">
            {!goal.isArchived && onArchive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] gap-1"
                onClick={() => onArchive(goal)}
              >
                <Archive className="h-3 w-3" />
                Archive
              </Button>
            )}
            {goal.isArchived && onRestore && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] gap-1"
                onClick={() => onRestore(goal)}
              >
                <RotateCcw className="h-3 w-3" />
                Restore
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] gap-1 text-loss"
                onClick={() => onDelete(goal)}
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
