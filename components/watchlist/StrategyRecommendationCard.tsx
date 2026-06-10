import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { formatScore } from "@/lib/watchlist/format";
import type { ScannerScoreResult } from "@/lib/watchlist/scanner-result";

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
  const ts = score.tradingSystems;

  return (
    <Card variant="bordered" className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="font-mono text-base">{ticker}</CardTitle>
            <CardDescription>Independent system scores</CardDescription>
          </div>
          <Badge variant={strategyVariant(rec.recommendedStrategy)}>
            {rec.recommendedStrategy}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {ts ? (
          <>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-terminal-muted mb-1">
                Main System
              </p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                <dt className="text-terminal-muted">Decision</dt>
                <dd className="font-mono text-terminal-text">
                  {ts.mainSystem.recommendation}
                </dd>
                <dt className="text-terminal-muted">Strategy Fit</dt>
                <dd className="font-mono text-terminal-text">
                  {formatScore(ts.mainSystem.strategyFitScore)}
                </dd>
                <dt className="text-terminal-muted">Tier</dt>
                <dd className="text-terminal-text">{ts.mainSystem.tier}</dd>
              </dl>
              <p className="mt-1 text-terminal-muted leading-relaxed">
                {ts.mainSystem.reason}
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-terminal-muted mb-1">
                20 EMA System
              </p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                <dt className="text-terminal-muted">Decision</dt>
                <dd className="font-mono text-terminal-text">
                  {ts.emaSystem.recommendation}
                </dd>
                <dt className="text-terminal-muted">EMA Score</dt>
                <dd className="font-mono text-terminal-text">
                  {formatScore(ts.emaSystem.emaScore)}
                </dd>
                <dt className="text-terminal-muted">Tier</dt>
                <dd className="text-terminal-text">{ts.emaSystem.tier}</dd>
              </dl>
              <p className="mt-1 text-terminal-muted leading-relaxed">
                {ts.emaSystem.reason}
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-terminal-muted mb-1">
                Confluence
              </p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                <dt className="text-terminal-muted">Score</dt>
                <dd className="font-mono text-terminal-text">
                  {ts.confluence.score}/10
                </dd>
              </dl>
              <p className="mt-1 text-terminal-muted leading-relaxed">
                {ts.confluence.reason}
              </p>
            </div>
          </>
        ) : (
          <p className="text-terminal-muted">No trading system data</p>
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
