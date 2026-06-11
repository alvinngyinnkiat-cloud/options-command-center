"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  archiveFinancialGoal,
  deleteFinancialGoal,
} from "@/app/actions/financial-goals";
import { partitionManagedGoals } from "@/lib/goals/build-managed-goals";
import type { GoalsDashboardData, ManagedFinancialGoal } from "@/lib/goals/types";
import { Plus } from "lucide-react";
import { GoalFormModal } from "./GoalFormModal";
import { ManagedGoalCard } from "./ManagedGoalCard";

interface GoalSettingsPanelProps {
  data: GoalsDashboardData;
  onDataChange: (data: GoalsDashboardData) => void;
}

function GoalSection({
  title,
  goals,
  emptyMessage,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: {
  title: string;
  goals: ManagedFinancialGoal[];
  emptyMessage: string;
  onEdit: (g: ManagedFinancialGoal) => void;
  onArchive?: (g: ManagedFinancialGoal) => void;
  onRestore?: (g: ManagedFinancialGoal) => void;
  onDelete?: (g: ManagedFinancialGoal) => void;
}) {
  if (goals.length === 0) {
    return (
      <section className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          {title}
        </h3>
        <p className="text-sm text-terminal-muted">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
        {title} ({goals.length})
      </h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {goals.map((goal) => (
          <ManagedGoalCard
            key={goal.id}
            goal={goal}
            onEdit={onEdit}
            onArchive={onArchive}
            onRestore={onRestore}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}

export function GoalSettingsPanel({
  data,
  onDataChange,
}: GoalSettingsPanelProps) {
  const [formGoal, setFormGoal] = useState<
    ManagedFinancialGoal | null | undefined
  >(undefined);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { active, completed, archived } = partitionManagedGoals(
    data.managedGoals
  );

  async function handleArchive(goal: ManagedFinancialGoal) {
    setBusyId(goal.id);
    const result = await archiveFinancialGoal(goal.id, true);
    setBusyId(null);
    if (result.success) onDataChange(result.data);
    else alert(result.error);
  }

  async function handleRestore(goal: ManagedFinancialGoal) {
    setBusyId(goal.id);
    const result = await archiveFinancialGoal(goal.id, false);
    setBusyId(null);
    if (result.success) onDataChange(result.data);
    else alert(result.error);
  }

  async function handleDelete(goal: ManagedFinancialGoal) {
    if (
      !confirm(
        `Delete "${goal.name}"? This cannot be undone. Change history for this goal will also be removed.`
      )
    ) {
      return;
    }
    setBusyId(goal.id);
    const result = await deleteFinancialGoal(goal.id);
    setBusyId(null);
    if (result.success) onDataChange(result.data);
    else alert(result.error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
            Goal Settings
          </h2>
          <p className="mt-1 text-[11px] text-terminal-muted">
            Add, edit, archive, or delete goals — My portfolio value only
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setFormGoal(null)}
        >
          <Plus className="h-4 w-4" />
          Add Goal
        </Button>
      </div>

      <GoalSection
        title="Active Goals"
        goals={active}
        emptyMessage="No active goals. Add a goal to get started."
        onEdit={setFormGoal}
        onArchive={handleArchive}
        onDelete={handleDelete}
      />

      <GoalSection
        title="Completed Goals"
        goals={completed}
        emptyMessage="No completed goals yet."
        onEdit={setFormGoal}
        onArchive={handleArchive}
        onDelete={handleDelete}
      />

      <GoalSection
        title="Archived Goals"
        goals={archived}
        emptyMessage="No archived goals."
        onEdit={setFormGoal}
        onRestore={handleRestore}
        onDelete={handleDelete}
      />

      {busyId && (
        <p className="text-[11px] text-terminal-muted">Updating goal…</p>
      )}

      {formGoal !== undefined && (
        <GoalFormModal
          goal={formGoal}
          onClose={() => setFormGoal(undefined)}
          onSaved={onDataChange}
        />
      )}
    </div>
  );
}
