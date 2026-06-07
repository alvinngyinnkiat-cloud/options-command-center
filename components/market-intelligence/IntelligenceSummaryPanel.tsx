import type { IntelligenceSummary } from "@/lib/market-intelligence/types";
import { SENTIMENT_LABELS } from "@/lib/market-intelligence/constants";

interface IntelligenceSummaryPanelProps {
  summary: IntelligenceSummary | null;
}

export function IntelligenceSummaryPanel({
  summary,
}: IntelligenceSummaryPanelProps) {
  if (!summary) {
    return (
      <div className="rounded-lg border border-terminal-border bg-terminal-elevated p-4 text-sm text-terminal-muted">
        Select a document or upload new intelligence to view generated summary.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-elevated p-4 space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
          Market Impact Sentiment
        </p>
        <p className="text-sm font-semibold text-terminal-text mt-1">
          {SENTIMENT_LABELS[summary.overallSentiment]}
        </p>
      </div>
      <Section title="Key Takeaways" items={summary.keyTakeaways} />
      <Section title="Bullish Signals" items={summary.bullishSignals} positive />
      <Section title="Bearish Signals" items={summary.bearishSignals} negative />
    </div>
  );
}

function Section({
  title,
  items,
  positive,
  negative,
}: {
  title: string;
  items: string[];
  positive?: boolean;
  negative?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-terminal-text mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li
            key={i}
            className={`text-xs ${
              positive
                ? "text-gain"
                : negative
                  ? "text-loss"
                  : "text-terminal-muted"
            }`}
          >
            · {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
