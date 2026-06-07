import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { formatScoreFraction } from "@/lib/watchlist/format";
import type { ScannerScoreResult } from "@/lib/watchlist/scanner-result";
import { cn } from "@/lib/utils";
import { DecisionBadge } from "./DecisionBadge";

interface StrategyRecommendationCardProps {
  ticker: string;
  score: ScannerScoreResult;
}

function strategyVariant(
  strategy: string
): "success" | "danger" | "info" | "outline" {
  switch (strategy) {
    case "Bull Put":
      return "success";
    case "Bear Call":
      return "danger";
    case "Iron Condor":
      return "info";
    default:
      return "outline";
  }
}

export function StrategyRecommendationCard({
  ticker,
  score,
}: StrategyRecommendationCardProps) {
  const rec = score.recommendation;

  return (
    <Card variant="bordered" className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="font-mono text-base">{ticker}</CardTitle>
            <CardDescription>Phase 6 strategy recommendation</CardDescription>
          </div>
          <Badge variant={strategyVariant(rec.recommendedStrategy)}>
            {rec.recommendedStrategy}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Total Score
            </p>
            <p className="font-mono font-semibold text-terminal-text">
              {rec.totalScore}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Decision
            </p>
            <DecisionBadge label={rec.decisionLabel} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Action
            </p>
            <p className="font-medium text-terminal-text">{rec.actionLabel}</p>
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-terminal-muted mb-1">
            Primary Reason
          </p>
          <p className="text-terminal-text leading-relaxed">{rec.primaryReason}</p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-terminal-muted mb-1">
            Pass / Fail Explanation
          </p>
          <p className="text-terminal-muted leading-relaxed">
            {rec.passFailExplanation}
          </p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-terminal-muted mb-1">
            Score Breakdown
          </p>
          <ul className="space-y-1">
            {rec.scoreBreakdown.map((item) => (
              <li
                key={item.category}
                className="flex items-center justify-between gap-2"
                title={item.reason}
              >
                <span className="text-terminal-muted">{item.category}</span>
                <span
                  className={cn(
                    "font-mono",
                    item.passed ? "text-profit" : "text-terminal-muted"
                  )}
                >
                  {formatScoreFraction(item.score, item.maxScore)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {(rec.sellPutEligible || rec.sellCallEligible) && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted mb-1">
              Future Strategy Eligibility
            </p>
            <ul className="space-y-1">
              {rec.sellPutEligible && (
                <li className="text-profit leading-relaxed">· Sell Put Eligible</li>
              )}
              {rec.sellCallEligible && (
                <li className="text-profit leading-relaxed">· Sell Call Eligible</li>
              )}
            </ul>
            {!rec.sellPutEligible && (
              <p className="mt-1 text-terminal-muted leading-relaxed">
                {rec.sellPutReason}
              </p>
            )}
            {!rec.sellCallEligible && (
              <p className="mt-1 text-terminal-muted leading-relaxed">
                {rec.sellCallReason}
              </p>
            )}
          </div>
        )}

        {rec.warningNotes.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-warning mb-1">
              Warning Notes
            </p>
            <ul className="space-y-1 text-warning/90">
              {rec.warningNotes.map((note) => (
                <li key={note} className="leading-relaxed">
                  · {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
