import type { ScannerScoreResult } from "@/lib/watchlist/scanner-result";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { withSupabaseQuery } from "@/lib/supabase/resolve-user";
import type { ScannerScore } from "@/types/database";

function mapScoreToRow(
  score: ScannerScoreResult,
  userId: string
): Omit<ScannerScore, "created_at" | "updated_at"> {
  const { recommendation } = score;

  return {
    id: crypto.randomUUID(),
    user_id: userId,
    watchlist_id: score.watchlistId,
    ticker: score.ticker,
    score_date: score.scoreDate,
    trend_score: score.trend.score,
    stochastic_score: score.stochastic.score,
    ema_score: score.tradingSystems.emaSystem.emaScore,
    support_resistance_score: score.supportResistance.score,
    total_score: score.tradingSystems.mainSystem.strategyFitScore,
    recommended_strategy: recommendation.recommendedStrategyType,
    action: recommendation.action,
    decision_label: score.tradingSystems.confluence.status,
    trend_pass: score.trend.passed,
    stochastic_pass: score.stochastic.passed,
    ema_pass: score.ema20.passed,
    sr_pass: score.supportResistance.passed,
    trend_reason: score.trend.reason,
    stochastic_reason: score.stochastic.reason,
    ema_reason: score.ema20.reason,
    sr_reason: score.supportResistance.reason,
    primary_reason: recommendation.primaryReason,
    pass_fail_explanation: recommendation.passFailExplanation,
    warning_notes:
      recommendation.warningNotes.length > 0
        ? JSON.stringify(recommendation.warningNotes)
        : null,
    intelligence_score: score.intelligence.score,
    combined_score: score.tradingSystems.mainSystem.strategyFitScore,
    intelligence_sentiment: score.intelligence.sentiment,
    intelligence_reason: score.intelligence.rationale,
  };
}

export async function persistScannerScores(
  scores: ScannerScoreResult[],
  _userId: string
): Promise<void> {
  if (!isSupabaseConfigured() || scores.length === 0) return;

  await withSupabaseQuery(
    async ({ userId, supabase }) => {
      for (const score of scores) {
        const { data: existing } = await supabase
          .from("scanner_scores")
          .select("id")
          .eq("watchlist_id", score.watchlistId)
          .eq("score_date", score.scoreDate)
          .maybeSingle();

        const row = mapScoreToRow(score, userId);
        if (existing) {
          row.id = (existing as { id: string }).id;
        }

        await supabase
          .from("scanner_scores")
          .upsert(row as never, { onConflict: "watchlist_id,score_date" });
      }
    },
    () => undefined
  );
}
