"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  createFinancialGoal,
  updateFinancialGoal,
} from "@/app/actions/financial-goals";
import type { FinancialGoalFormInput } from "@/lib/goals/goal-models";
import { goalCategoryLabel } from "@/lib/goals/goal-models";
import type { GoalsDashboardData, ManagedFinancialGoal } from "@/lib/goals/types";
import type { GoalType } from "@/types/database";
import { X } from "lucide-react";

const GOAL_TYPES: GoalType[] = [
  "net_worth",
  "income",
  "custom",
  "allocation",
  "risk_capacity",
];

function emptyForm(): FinancialGoalFormInput {
  return {
    name: "",
    goalType: "custom",
    targetAmount: 0,
    currentAmount: 0,
    targetDate: null,
    startDate: new Date().toISOString().slice(0, 10),
    notes: null,
    assumedYieldPct: null,
  };
}

function formFromGoal(goal: ManagedFinancialGoal): FinancialGoalFormInput {
  return {
    name: goal.name,
    goalType: goal.goalType,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentValue,
    targetDate: goal.targetDate,
    startDate: goal.startDate,
    notes: goal.notes,
    assumedYieldPct: goal.assumedYieldPct,
  };
}

interface GoalFormModalProps {
  goal: ManagedFinancialGoal | null | undefined;
  onClose: () => void;
  onSaved: (data: GoalsDashboardData) => void;
}

export function GoalFormModal({ goal, onClose, onSaved }: GoalFormModalProps) {
  const isEdit = goal != null && goal !== undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [form, setForm] = useState<FinancialGoalFormInput>(
    isEdit ? formFromGoal(goal) : emptyForm()
  );

  const inputClass =
    "w-full h-9 rounded-md border border-terminal-border bg-terminal-surface px-3 text-sm text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50";
  const labelClass =
    "text-[10px] uppercase tracking-wider text-terminal-muted";

  const usesLiveCurrent =
    form.goalType === "net_worth" || form.goalType === "income";

  function set<K extends keyof FinancialGoalFormInput>(
    key: K,
    value: FinancialGoalFormInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Goal name is required.");
      return;
    }
    if (!Number.isFinite(form.targetAmount) || form.targetAmount <= 0) {
      setError("Enter a valid target amount.");
      return;
    }

    setBusy(true);
    const result = isEdit
      ? await updateFinancialGoal(
          goal!.id,
          form,
          changeReason.trim() || null
        )
      : await createFinancialGoal(form);

    setBusy(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onSaved(result.data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-terminal-border bg-terminal-bg p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit Goal" : "Add Goal"}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Goal Name</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Portfolio Value"
            />
          </div>

          <div>
            <label className={labelClass}>Goal Category</label>
            <select
              className={inputClass}
              value={form.goalType}
              onChange={(e) => set("goalType", e.target.value as GoalType)}
              disabled={isEdit && (goal?.goalType === "net_worth" || goal?.goalType === "income")}
            >
              {GOAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {goalCategoryLabel(t)}
                </option>
              ))}
            </select>
            {usesLiveCurrent && (
              <p className="mt-1 text-[11px] text-terminal-muted">
                Current value is computed from live portfolio data (My P/L only).
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Target {form.goalType === "income" ? "(Monthly SGD)" : "(SGD)"}
              </label>
              <input
                type="number"
                min={1}
                className={`${inputClass} font-mono`}
                value={form.targetAmount || ""}
                onChange={(e) =>
                  set("targetAmount", parseFloat(e.target.value) || 0)
                }
              />
            </div>
            {!usesLiveCurrent && (
              <div>
                <label className={labelClass}>Current Value (SGD)</label>
                <input
                  type="number"
                  min={0}
                  className={`${inputClass} font-mono`}
                  value={form.currentAmount ?? ""}
                  onChange={(e) =>
                    set("currentAmount", parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                type="date"
                className={inputClass}
                value={form.startDate ?? ""}
                onChange={(e) => set("startDate", e.target.value || null)}
              />
            </div>
            <div>
              <label className={labelClass}>Target Date</label>
              <input
                type="date"
                className={inputClass}
                value={form.targetDate ?? ""}
                onChange={(e) => set("targetDate", e.target.value || null)}
              />
            </div>
          </div>

          {form.goalType === "income" && (
            <div>
              <label className={labelClass}>Assumed Annual Yield %</label>
              <input
                type="number"
                min={0.5}
                max={20}
                step={0.1}
                className={`${inputClass} font-mono`}
                value={form.assumedYieldPct ?? ""}
                onChange={(e) =>
                  set(
                    "assumedYieldPct",
                    e.target.value ? parseFloat(e.target.value) : null
                  )
                }
              />
            </div>
          )}

          <div>
            <label className={labelClass}>Description / Notes</label>
            <textarea
              className={`${inputClass} h-20 py-2 resize-none`}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
              placeholder="Optional notes about this goal"
            />
          </div>

          {isEdit && (
            <div>
              <label className={labelClass}>
                Reason for Change (optional)
              </label>
              <input
                className={inputClass}
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="e.g. Increased target after salary raise"
              />
            </div>
          )}

          {error && <p className="text-sm text-loss">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save Goal" : "Add Goal"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
