"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { PortfolioMilestonesCard } from "@/components/portfolio/PortfolioMilestonesCard";
import type {
  AchievementMilestone,
  DailyPortfolioSnapshot,
  GoalProgressMilestone,
  PortfolioMilestones,
} from "@/lib/portfolio/daily-snapshot-types";
import {
  ACHIEVEMENT_MILESTONE_THRESHOLDS,
  LONG_TERM_GOAL_THRESHOLDS,
  buildAchievementMilestones,
  buildGoalProgressMilestones,
} from "@/lib/portfolio/snapshot-history";
import { formatCurrency } from "@/lib/utils";
import { Pencil, Plus, Trash2, X } from "lucide-react";

const CUSTOM_MILESTONES_KEY = "occ-custom-portfolio-milestones";
const CUSTOM_MILESTONES_EVENT = "occ-custom-milestones-updated";
const EMPTY_CUSTOM_MILESTONES: CustomMilestoneRecord[] = [];

interface CustomMilestoneRecord {
  id: string;
  valueSgd: number;
}

let customMilestonesSnapshot = EMPTY_CUSTOM_MILESTONES;
let customMilestonesRawKey: string | null | undefined;

function createCustomMilestoneId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseCustomMilestones(raw: string | null): CustomMilestoneRecord[] {
  if (!raw) return EMPTY_CUSTOM_MILESTONES;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY_CUSTOM_MILESTONES;

    if (parsed.every((entry) => typeof entry === "number")) {
      const values = parsed.filter(
        (n): n is number => typeof n === "number" && n > 0
      );
      if (values.length === 0) return EMPTY_CUSTOM_MILESTONES;
      return values.map((valueSgd) => ({
        id: createCustomMilestoneId(),
        valueSgd,
      }));
    }

    const records = parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const row = entry as { id?: unknown; valueSgd?: unknown };
        const valueSgd = Number(row.valueSgd);
        if (!Number.isFinite(valueSgd) || valueSgd <= 0) return null;
        return {
          id:
            typeof row.id === "string" && row.id.length > 0
              ? row.id
              : createCustomMilestoneId(),
          valueSgd,
        };
      })
      .filter((entry): entry is CustomMilestoneRecord => entry != null);

    return records.length === 0 ? EMPTY_CUSTOM_MILESTONES : records;
  } catch {
    return EMPTY_CUSTOM_MILESTONES;
  }
}

function invalidateCustomMilestonesCache() {
  customMilestonesRawKey = undefined;
}

function saveCustomMilestones(values: CustomMilestoneRecord[]) {
  localStorage.setItem(CUSTOM_MILESTONES_KEY, JSON.stringify(values));
}

function subscribeToCustomMilestones(onStoreChange: () => void) {
  const onChange = () => {
    invalidateCustomMilestonesCache();
    onStoreChange();
  };
  window.addEventListener(CUSTOM_MILESTONES_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CUSTOM_MILESTONES_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getCustomMilestonesSnapshot(): CustomMilestoneRecord[] {
  if (typeof window === "undefined") return EMPTY_CUSTOM_MILESTONES;
  const raw = localStorage.getItem(CUSTOM_MILESTONES_KEY);
  if (raw === customMilestonesRawKey) return customMilestonesSnapshot;
  customMilestonesRawKey = raw;
  customMilestonesSnapshot = parseCustomMilestones(raw);
  return customMilestonesSnapshot;
}

function getCustomMilestonesServerSnapshot(): CustomMilestoneRecord[] {
  return EMPTY_CUSTOM_MILESTONES;
}

interface MilestoneTrackerPanelProps {
  snapshots: DailyPortfolioSnapshot[];
  milestones: PortfolioMilestones;
}

export function MilestoneTrackerPanel({
  snapshots,
  milestones,
}: MilestoneTrackerPanelProps) {
  const customMilestones = useSyncExternalStore(
    subscribeToCustomMilestones,
    getCustomMilestonesSnapshot,
    getCustomMilestonesServerSnapshot
  );
  const [customInput, setCustomInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState("");

  const setCustomMilestoneRecords = (values: CustomMilestoneRecord[]) => {
    const sorted = [...values].sort((a, b) => a.valueSgd - b.valueSgd);
    saveCustomMilestones(sorted);
    window.dispatchEvent(new Event(CUSTOM_MILESTONES_EVENT));
  };

  const currentValue = milestones.current;

  const achievementMilestones = useMemo(
    () =>
      buildAchievementMilestones(snapshots, ACHIEVEMENT_MILESTONE_THRESHOLDS),
    [snapshots]
  );

  const longTermGoals = useMemo(
    () =>
      buildGoalProgressMilestones(currentValue, LONG_TERM_GOAL_THRESHOLDS),
    [currentValue]
  );

  const customGoalProgress = useMemo(() => {
    const customIds = new Map(
      customMilestones.map((m) => [m.valueSgd, m.id] as const)
    );
    return buildGoalProgressMilestones(
      currentValue,
      customMilestones.map((m) => m.valueSgd),
      { customIds }
    );
  }, [currentValue, customMilestones]);

  function addCustomMilestone() {
    const value = Number(customInput);
    if (!Number.isFinite(value) || value <= 0) return;
    if (customMilestones.some((m) => m.valueSgd === value)) return;
    const next = [
      ...customMilestones,
      { id: createCustomMilestoneId(), valueSgd: value },
    ];
    setCustomMilestoneRecords(next);
    setCustomInput("");
  }

  function startEditCustom(id: string, current: number) {
    setEditingId(id);
    setEditInput(String(current));
  }

  function cancelEditCustom() {
    setEditingId(null);
    setEditInput("");
  }

  function saveEditCustom(id: string) {
    const value = Number(editInput);
    if (!Number.isFinite(value) || value <= 0) return;
    if (customMilestones.some((m) => m.id !== id && m.valueSgd === value)) {
      return;
    }
    const next = customMilestones.map((m) =>
      m.id === id ? { ...m, valueSgd: value } : m
    );
    setCustomMilestoneRecords(next);
    cancelEditCustom();
  }

  function deleteCustomMilestone(id: string) {
    setCustomMilestoneRecords(customMilestones.filter((m) => m.id !== id));
    if (editingId === id) cancelEditCustom();
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
        Milestone Tracker
      </h3>

      <PortfolioMilestonesCard milestones={milestones} />

      <section className="space-y-3">
        <h4 className="text-[10px] font-medium uppercase tracking-wider text-terminal-muted">
          Historical Achievements
        </h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {achievementMilestones.map((m) => (
            <AchievementMilestoneCard key={m.thresholdSgd} milestone={m} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-[10px] font-medium uppercase tracking-wider text-terminal-muted">
          Long-Term Goals
        </h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {longTermGoals.map((m) => (
            <GoalProgressCard key={m.goalValueSgd} milestone={m} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-[10px] font-medium uppercase tracking-wider text-terminal-muted">
          Custom Milestones
        </h4>
        {customGoalProgress.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {customGoalProgress.map((m) => (
              <div key={m.id ?? m.goalValueSgd} className="relative">
                {editingId === m.id ? (
                  <div className="rounded-lg border border-terminal-border bg-terminal-elevated/30 p-3 space-y-2">
                    <label className="block text-[10px] uppercase tracking-wider text-terminal-muted">
                      Edit Goal (SGD)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1000"
                      value={editInput}
                      onChange={(e) => setEditInput(e.target.value)}
                      className="w-full h-8 rounded-md border border-terminal-border bg-terminal-surface px-3 font-mono text-xs text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => m.id && saveEditCustom(m.id)}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEditCustom}
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <GoalProgressCard milestone={m} dashed />
                    {m.id ? (
                      <div className="absolute right-2 top-2 flex gap-1">
                        <button
                          type="button"
                          onClick={() => startEditCustom(m.id!, m.goalValueSgd)}
                          className="rounded p-1 text-terminal-muted hover:bg-terminal-elevated hover:text-terminal-text"
                          aria-label="Edit milestone"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCustomMilestone(m.id!)}
                          className="rounded p-1 text-terminal-muted hover:bg-terminal-elevated hover:text-loss"
                          aria-label="Delete milestone"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-terminal-muted">
            No custom milestones yet. Add a goal below.
          </p>
        )}

        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-terminal-border bg-terminal-elevated/30 p-3">
          <div className="flex-1 min-w-[140px]">
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-terminal-muted">
              Custom Milestone (SGD)
            </label>
            <input
              type="number"
              min="1"
              step="1000"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="e.g. 150000"
              className="w-full h-8 rounded-md border border-terminal-border bg-terminal-surface px-3 font-mono text-xs text-terminal-text focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={addCustomMilestone}>
            <Plus className="h-3.5 w-3.5" />
            Add Milestone
          </Button>
        </div>
      </section>
    </div>
  );
}

function AchievementMilestoneCard({
  milestone,
}: {
  milestone: AchievementMilestone;
}) {
  const reached = milestone.reachedDate != null;
  const status = milestone.insufficientData
    ? "Not enough historical data"
    : reached
      ? milestone.reachedDate!
      : "Not yet";

  return (
    <StatCard
      label={milestone.label}
      value={
        reached
          ? formatCurrency(milestone.thresholdSgd)
          : milestone.insufficientData
            ? "Unknown"
            : "Not yet"
      }
      change={status}
      changeType={reached ? "positive" : "neutral"}
    />
  );
}

function GoalProgressCard({
  milestone,
  dashed = false,
}: {
  milestone: GoalProgressMilestone;
  dashed?: boolean;
}) {
  return (
    <StatCard
      label={milestone.label}
      value={formatCurrency(milestone.currentValueSgd)}
      change={`Progress: ${milestone.progressPct.toFixed(1)}% · Remaining: ${formatCurrency(milestone.remainingSgd)}`}
      changeType={
        milestone.progressPct >= 100
          ? "positive"
          : milestone.progressPct >= 50
            ? "neutral"
            : "negative"
      }
      className={dashed ? "border-dashed" : undefined}
    />
  );
}
