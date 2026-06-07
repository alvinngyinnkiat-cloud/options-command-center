import { COMBINED_WEIGHTS } from "@/lib/market-intelligence/constants";
import type { OptionsDecisionRow } from "@/lib/market-intelligence/types";

interface OptionsDecisionAssistantProps {
  rows: OptionsDecisionRow[];
}

export function OptionsDecisionAssistant({
  rows,
}: OptionsDecisionAssistantProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-terminal-muted">
        Technical scanner {COMBINED_WEIGHTS.technical * 100}% + Market
        intelligence {COMBINED_WEIGHTS.intelligence * 100}% = Combined decision.
        Strategy rules still evaluate technical pass/fail only.
      </p>
      <div className="overflow-x-auto rounded-lg border border-terminal-border">
        <table className="w-full min-w-[900px] text-xs">
          <thead>
            <tr className="border-b border-terminal-border bg-terminal-elevated">
              <th className="px-3 py-2 text-left">Ticker</th>
              <th className="px-3 py-2 text-right">Technical</th>
              <th className="px-3 py-2 text-right">Intel</th>
              <th className="px-3 py-2 text-right">Combined</th>
              <th className="px-3 py-2 text-left">Sentiment</th>
              <th className="px-3 py-2 text-left">Strategy</th>
              <th className="px-3 py-2 text-left">Decision</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.ticker}
                className="border-b border-terminal-border/50"
              >
                <td className="px-3 py-2 font-medium">{row.ticker}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {row.technicalScore}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {row.intelligenceScore}
                </td>
                <td className="px-3 py-2 text-right font-mono text-accent">
                  {row.combinedScore}
                </td>
                <td className="px-3 py-2">{row.sentimentLabel}</td>
                <td className="px-3 py-2">{row.recommendedStrategy}</td>
                <td className="px-3 py-2">{row.combinedDecision}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
