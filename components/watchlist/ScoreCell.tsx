import type { ScoreComponentResult } from "@/lib/watchlist/scoring/types";
import { formatScoreFraction } from "@/lib/watchlist/format";
import { cn } from "@/lib/utils";

interface ScoreCellProps {
  result: ScoreComponentResult;
  className?: string;
}

export function ScoreCell({ result, className }: ScoreCellProps) {
  return (
    <td
      className={cn("px-2 py-2.5 font-mono text-right", className)}
      title={result.reason}
    >
      <span
        className={cn(
          result.passed ? "text-profit" : "text-terminal-muted",
          result.score > 0 && !result.passed && "text-warning"
        )}
      >
        {formatScoreFraction(result.score, result.maxScore)}
      </span>
    </td>
  );
}
