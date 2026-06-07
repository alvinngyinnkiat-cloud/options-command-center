import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { TimelinePoint } from "@/lib/goals/types";
import { formatSGD } from "@/lib/goals/format";
import { cn } from "@/lib/utils";

interface TimelineProjectionProps {
  timeline: TimelinePoint[];
}

export function TimelineProjection({ timeline }: TimelineProjectionProps) {
  const milestones = [0, 6, 12, 18, 24, 36].map((i) => timeline[i]).filter(Boolean);

  return (
    <Card variant="bordered">
      <CardHeader>
        <CardTitle>Timeline Projection</CardTitle>
        <CardDescription>
          Projected portfolio value and passive income at key milestones
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-terminal-border text-left text-xs uppercase tracking-wider text-terminal-muted">
                <th className="px-3 py-2 font-medium">Period</th>
                <th className="px-3 py-2 font-medium text-right">Portfolio</th>
                <th className="px-3 py-2 font-medium text-right">Passive Income</th>
                <th className="px-3 py-2 font-medium text-right">vs Portfolio Goal</th>
                <th className="px-3 py-2 font-medium text-right">vs Income Goal</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((point, index) => {
                const portfolioPct =
                  (point.portfolioValue / point.portfolioTarget) * 100;
                const incomePct =
                  (point.passiveIncome / point.incomeTarget) * 100;

                return (
                  <tr
                    key={point.label}
                    className="border-b border-terminal-border/50 hover:bg-terminal-elevated/50"
                  >
                    <td className="px-3 py-2.5 font-mono text-terminal-text">
                      {index === 0 ? "Now" : `+${[0, 6, 12, 18, 24, 36][index]}mo`}
                      <span className="ml-2 text-terminal-muted text-xs">
                        {point.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-right text-terminal-text">
                      {formatSGD(point.portfolioValue)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-right text-terminal-text">
                      {formatSGD(point.passiveIncome)}/mo
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 font-mono text-right",
                        portfolioPct >= 100 ? "text-profit" : "text-terminal-muted"
                      )}
                    >
                      {portfolioPct.toFixed(0)}%
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 font-mono text-right",
                        incomePct >= 100 ? "text-profit" : "text-terminal-muted"
                      )}
                    >
                      {incomePct.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
