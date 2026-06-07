import type {
  WeekendOpportunityEntry,
  WeekendOpportunityLists,
} from "@/lib/weekend-review/types";
import { cn } from "@/lib/utils";

interface WeekendOpportunitiesPanelProps {
  opportunities: WeekendOpportunityLists;
}

function OpportunityList({
  title,
  entries,
  colorClass,
}: {
  title: string;
  entries: WeekendOpportunityEntry[];
  colorClass: string;
}) {
  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-elevated/20 p-3">
      <h4 className={cn("mb-2 text-xs font-semibold uppercase tracking-wider", colorClass)}>
        {title}
      </h4>
      {entries.length === 0 ? (
        <p className="text-xs text-terminal-muted">No candidates</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li
              key={e.watchlistId}
              className="rounded border border-terminal-border/50 px-2 py-1.5 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-semibold text-terminal-text">
                  {e.ticker}
                </span>
                <span className="font-mono text-terminal-muted">{e.totalScore}</span>
              </div>
              <p className="text-terminal-muted">{e.action} · {e.decisionLabel}</p>
              <p className="mt-0.5 truncate text-[11px] text-terminal-muted">
                {e.primaryReason}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function WeekendOpportunitiesPanel({
  opportunities,
}: WeekendOpportunitiesPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <OpportunityList
        title="Top 5 Bull Put"
        entries={opportunities.bullPut}
        colorClass="text-profit"
      />
      <OpportunityList
        title="Top 5 Bear Call"
        entries={opportunities.bearCall}
        colorClass="text-loss"
      />
      <OpportunityList
        title="Top 5 Iron Condor"
        entries={opportunities.ironCondor}
        colorClass="text-warning"
      />
      <OpportunityList
        title="No Trade List"
        entries={opportunities.noTrade}
        colorClass="text-terminal-muted"
      />
    </div>
  );
}
