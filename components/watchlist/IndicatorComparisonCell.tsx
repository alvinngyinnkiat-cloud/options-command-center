import type { IndicatorComparison } from "@/lib/watchlist/types";
import {
  formatIndicator,
  formatSignedPrice,
  formatStochastic,
} from "@/lib/watchlist/format";
import { cn, formatPercent } from "@/lib/utils";
import { DirectionIndicator } from "./DirectionIndicator";

interface IndicatorComparisonCellProps {
  comparison: IndicatorComparison;
  kind: "price" | "stochastic";
}

function formatValue(value: number, kind: "price" | "stochastic"): string {
  return kind === "stochastic" ? formatStochastic(value) : formatIndicator(value);
}

export function IndicatorComparisonCell({
  comparison,
  kind,
}: IndicatorComparisonCellProps) {
  if (!comparison.available || comparison.difference == null) {
    return (
      <td className="px-2 py-2.5 font-mono text-terminal-muted text-right">—</td>
    );
  }

  const diffClass =
    comparison.difference > 0
      ? "text-profit"
      : comparison.difference < 0
        ? "text-loss"
        : "text-terminal-muted";

  return (
    <td
      className="px-2 py-2.5 text-right border-l border-terminal-border/50"
      title={`Today ${formatValue(comparison.today, kind)} vs Prev ${comparison.previous != null ? formatValue(comparison.previous, kind) : "—"}`}
    >
      <div className={cn("font-mono text-terminal-text", diffClass)}>
        {formatSignedPrice(comparison.difference, kind === "stochastic" ? 1 : 2)}
      </div>
      {comparison.differencePct != null && (
        <div className={cn("font-mono text-[10px]", diffClass)}>
          {formatPercent(comparison.differencePct)}
        </div>
      )}
      {comparison.direction && (
        <div className="mt-0.5 flex justify-end">
          <DirectionIndicator direction={comparison.direction} />
        </div>
      )}
    </td>
  );
}
