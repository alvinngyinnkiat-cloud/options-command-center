"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { formatGoalDateDisplay } from "@/lib/goals/format";
import type { GoalChangeRecord } from "@/lib/goals/types";
import { formatSGD } from "@/lib/utils";

interface GoalChangeHistoryPanelProps {
  changes: GoalChangeRecord[];
}

function formatFieldValue(fieldName: string, value: string | null): string {
  if (!value) return "—";
  if (fieldName === "target_amount") {
    const num = Number(value);
    if (Number.isFinite(num)) return formatSGD(num);
  }
  if (fieldName === "target_date") {
    return formatGoalDateDisplay(value);
  }
  return value;
}

function fieldLabel(fieldName: string): string {
  switch (fieldName) {
    case "target_amount":
      return "Target";
    case "target_date":
      return "Target Date";
    case "name":
      return "Name";
    case "notes":
      return "Notes";
    default:
      return fieldName;
  }
}

export function GoalChangeHistoryPanel({
  changes,
}: GoalChangeHistoryPanelProps) {
  if (changes.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Goal Change History
        </h2>
        <p className="text-sm text-terminal-muted">
          Goal edits will appear here with previous and new values.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
        Goal Change History
      </h2>
      <Card variant="default">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Changes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {changes.map((change) => (
            <div
              key={change.id}
              className="border-b border-terminal-border/50 pb-3 last:border-0 last:pb-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-medium">{change.goalName}</p>
                <p className="font-mono text-[10px] text-terminal-muted">
                  {formatGoalDateDisplay(change.createdAt.slice(0, 10))}
                </p>
              </div>
              <p className="mt-1 text-[11px] text-terminal-muted">
                {fieldLabel(change.fieldName)}
              </p>
              <p className="font-mono text-sm">
                {formatFieldValue(change.fieldName, change.previousValue)}
                <span className="mx-2 text-terminal-muted">→</span>
                {formatFieldValue(change.fieldName, change.newValue)}
              </p>
              {change.changeReason && (
                <p className="mt-1 text-[11px] text-terminal-muted italic">
                  {change.changeReason}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
