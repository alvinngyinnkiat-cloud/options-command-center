"use client";

import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { AnalysisSentiment, TradingAnalysisViewModel } from "@/lib/watchlist/analysis-card";
import {
  formatDistancePct,
  formatIndicator,
  formatPrice,
  formatScore,
  formatSignedPrice,
  formatStochastic,
} from "@/lib/watchlist/format";
import { cn, formatPercent } from "@/lib/utils";
import { DirectionIndicator } from "./DirectionIndicator";

interface TradingAnalysisCardProps {
  model: TradingAnalysisViewModel;
}

function sentimentTextClass(sentiment: AnalysisSentiment): string {
  switch (sentiment) {
    case "bullish":
      return "text-profit";
    case "bearish":
      return "text-loss";
    case "neutral":
      return "text-warning";
  }
}

function passFailClass(value: "Pass" | "Fail" | "—"): string {
  if (value === "Pass") return "text-profit";
  if (value === "Fail") return "text-loss";
  return "text-terminal-muted";
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

function boolLabel(value: boolean, yes = "Yes", no = "No"): string {
  return value ? yes : no;
}

function boolClass(value: boolean, positiveWhenTrue = true): string {
  if (value === positiveWhenTrue) return "text-profit";
  return "text-terminal-muted";
}

interface FieldProps {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  className?: string;
}

function Field({ label, value, valueClassName, className }: FieldProps) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
        {label}
      </p>
      <div className={cn("font-mono text-xs text-terminal-text", valueClassName)}>
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-terminal-border bg-terminal-elevated/30 p-3">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-accent/90">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">{children}</div>
    </div>
  );
}

export function TradingAnalysisCard({ model }: TradingAnalysisCardProps) {
  const avgDiffClass =
    model.averagePriceDifference > 0
      ? "text-profit"
      : model.averagePriceDifference < 0
        ? "text-loss"
        : "text-warning";

  return (
    <Card variant="bordered" className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="font-mono text-lg">
              {model.ticker}
              <span className="ml-2 text-sm font-normal text-terminal-muted">
                #{model.priorityRank}
              </span>
            </CardTitle>
            <p className="text-[10px] text-terminal-muted">
              Trading Analysis · Average Price scoring
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {model.strategyFitScore != null && (
              <span className="font-mono text-sm font-semibold text-terminal-text">
                Main {formatScore(model.strategyFitScore)}
              </span>
            )}
            {model.emaSystemScore != null && (
              <span className="font-mono text-xs text-terminal-muted">
                EMA {formatScore(model.emaSystemScore)}
                {model.confluenceStatus !== "—"
                  ? ` · ${model.confluenceStatus}`
                  : ""}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-xs">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Section title="1. SO Analysis">
            <Field label="SO Value" value={formatStochastic(model.soValue)} />
            <Field
              label="Previous SO"
              value={
                model.previousSo != null
                  ? formatStochastic(model.previousSo)
                  : "—"
              }
            />
            <Field
              label="Momentum Status"
              value={model.momentumStatus}
              valueClassName={sentimentTextClass(model.momentumSentiment)}
            />
          </Section>

          <Section title="2. Support / Resistance">
            <Field
              label="ATR(14)"
              value={formatIndicator(model.atr14)}
              className="col-span-2"
            />
            <Field
              label="Support"
              value={
                model.support1 != null ? formatPrice(model.support1) : "—"
              }
            />
            <Field
              label="Adjusted Support"
              value={
                model.adjustedSupport1 != null
                  ? formatPrice(model.adjustedSupport1)
                  : "—"
              }
            />
            <Field
              label="Resistance"
              value={
                model.resistance1 != null
                  ? formatPrice(model.resistance1)
                  : "—"
              }
            />
            <Field
              label="Adjusted Resistance"
              value={
                model.adjustedResistance1 != null
                  ? formatPrice(model.adjustedResistance1)
                  : "—"
              }
            />
            <Field
              label="Mid Point"
              value={
                model.midPoint != null ? formatPrice(model.midPoint) : "—"
              }
              className="col-span-2"
            />
          </Section>

          <Section title="3. Average Price Analysis">
            <Field
              label="Previous Avg Price"
              value={formatPrice(model.previousAveragePrice)}
            />
            <Field
              label="Current Avg Price"
              value={formatPrice(model.currentAveragePrice)}
            />
            <Field
              label="Difference"
              value={formatSignedPrice(model.averagePriceDifference)}
              valueClassName={avgDiffClass}
            />
            <Field
              label="Difference %"
              value={formatPercent(model.averagePriceDifferencePct)}
              valueClassName={avgDiffClass}
            />
            <Field
              label="Direction"
              value={
                <DirectionIndicator direction={model.averagePriceDirection} />
              }
              className="col-span-2"
            />
          </Section>

          <Section title="4. EMA20 Analysis">
            <Field label="EMA20" value={formatIndicator(model.ema20)} />
            <Field
              label="Avg Price vs EMA20"
              value={model.averagePriceVsEma20Label}
              valueClassName={sentimentTextClass(
                model.averagePriceVsEma20Label === "Above"
                  ? "bullish"
                  : model.averagePriceVsEma20Label === "Below"
                    ? "bearish"
                    : "neutral"
              )}
            />
            <Field
              label="Distance %"
              value={formatDistancePct(model.ema20DistancePct)}
            />
            <Field
              label="Pass / Fail"
              value={model.ema20PassFail}
              valueClassName={passFailClass(model.ema20PassFail)}
            />
          </Section>

          <Section title="5. Trend Analysis">
            <Field label="SMA200" value={formatIndicator(model.sma200)} />
            <Field label="SMA50" value={formatIndicator(model.sma50)} />
            <Field
              label="Avg Price vs SMA200"
              value={model.averagePriceVsSma200Label}
              valueClassName={sentimentTextClass(
                model.averagePriceVsSma200Label === "Above"
                  ? "bullish"
                  : model.averagePriceVsSma200Label === "Below"
                    ? "bearish"
                    : "neutral"
              )}
            />
            <Field
              label="SMA50 vs SMA200"
              value={model.sma50VsSma200Label}
              valueClassName={sentimentTextClass(
                model.sma50VsSma200Label === "Above"
                  ? "bullish"
                  : model.sma50VsSma200Label === "Below"
                    ? "bearish"
                    : "neutral"
              )}
            />
            <Field
              label="Trend Direction"
              value={model.trendDirection}
              valueClassName={sentimentTextClass(model.trendSentiment)}
              className="col-span-2"
            />
          </Section>

          <Section title="6. Main System">
            <Field label="Decision" value={model.mainRecommendation} />
            <Field
              label="Strategy Fit Score"
              value={
                model.strategyFitScore != null
                  ? formatScore(model.strategyFitScore)
                  : "—"
              }
            />
            <Field label="Tier" value={model.mainTier} />
            <Field
              label="Reason"
              value={model.mainReason}
              className="col-span-2"
            />
          </Section>

          <Section title="7. 20 EMA System">
            <Field label="Decision" value={model.emaRecommendation} />
            <Field
              label="EMA Score"
              value={
                model.emaSystemScore != null
                  ? formatScore(model.emaSystemScore)
                  : "—"
              }
            />
            <Field label="Tier" value={model.emaTier} />
            <Field
              label="Reason"
              value={model.emaReason}
              className="col-span-2"
            />
          </Section>

          <Section title="8. Confluence">
            <Field label="Status" value={model.confluenceStatus} />
            <Field
              label="Reason"
              value={model.confluenceReason}
              className="col-span-2"
            />
          </Section>

          <Section title="9. Recommendation">
            <Field
              label="Strategy"
              value={
                <Badge variant={strategyVariant(model.strategy)}>
                  {model.strategy}
                </Badge>
              }
              className="col-span-2"
            />
            <Field label="Action" value={model.action} className="col-span-2" />
            <div className="col-span-2 space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
                Primary Reason
              </p>
              <p className="text-xs leading-relaxed text-terminal-text">
                {model.primaryReason}
              </p>
            </div>
            {model.warningNotes.length > 0 && (
              <div className="col-span-2 space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-warning">
                  Warning Notes
                </p>
                <ul className="space-y-0.5 text-warning/90">
                  {model.warningNotes.map((note) => (
                    <li key={note} className="leading-relaxed">
                      · {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          <Section title="10. Weekend Review Status">
            <Field
              label="Updated This Weekend"
              value={boolLabel(model.weekendReview.updatedThisWeekend)}
              valueClassName={boolClass(model.weekendReview.updatedThisWeekend)}
            />
            <Field
              label="Updated Last Week"
              value={boolLabel(model.weekendReview.updatedLastWeek)}
              valueClassName={boolClass(
                model.weekendReview.updatedLastWeek,
                false
              )}
            />
            <Field
              label="Needs Review"
              value={boolLabel(model.weekendReview.needsReview)}
              valueClassName={
                model.weekendReview.needsReview
                  ? "text-warning"
                  : "text-profit"
              }
              className="col-span-2"
            />
          </Section>
        </div>
      </CardContent>
    </Card>
  );
}
