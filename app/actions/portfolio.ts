"use server";

import {
  buildCalculatedValues,
  buildPortfolioMetrics,
} from "@/lib/portfolio/calculations";
import { DEFAULT_USD_SGD_RATE } from "@/lib/portfolio/currency";
import { MOCK_PORTFOLIO_OVERRIDE, MOCK_PORTFOLIO_RAW } from "@/lib/mock/portfolio";
import type { PortfolioMetrics, PortfolioOverrideInput } from "@/lib/portfolio/types";
import { getPortfolioDashboardData } from "@/lib/supabase/queries/portfolio";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { upsertDailyPortfolioSnapshot } from "@/lib/supabase/queries/daily-portfolio-snapshots";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { PortfolioOverride } from "@/types/database";

export type PortfolioOverrideActionResult =
  | { success: true; metrics: PortfolioMetrics }
  | { success: false; error: string };

export async function savePortfolioOverride(
  input: PortfolioOverrideInput
): Promise<PortfolioOverrideActionResult> {
  if (!isSupabaseConfigured()) {
    const raw = {
      ...MOCK_PORTFOLIO_RAW,
      override: {
        ...input,
        overrideUpdatedAt: new Date().toISOString(),
      },
    };
    const metrics = buildPortfolioMetrics(raw, "mock");
    const tradesData = await getOptionsTradesData();
    await upsertDailyPortfolioSnapshot({
      userId: "mock-user",
      metrics,
      trades: tradesData.trades,
    });
    return {
      success: true,
      metrics,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const raw = {
        ...MOCK_PORTFOLIO_RAW,
        override: {
          ...input,
          overrideUpdatedAt: new Date().toISOString(),
        },
      };
      return {
        success: true,
        metrics: buildPortfolioMetrics(raw, "mock"),
      };
    }

    const { data: existing } = await supabase
      .from("portfolio_overrides")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const metrics = await getPortfolioDashboardData();
    const calculated = buildCalculatedValues(metrics.holdings);
    const manualOverallSgd =
      (input.manualUsStocksOptionsSgdEquivalent ??
        calculated.usStocksOptionsSgdEquivalent) +
      (input.manualCryptoValueSgd ?? calculated.cryptoValue) +
      (input.manualSgStocksCashValueSgd ?? calculated.sgStocksCashValueSgd);
    const derivedTotal = input.useManualOverride
      ? manualOverallSgd
      : calculated.portfolioValue;

    const payload: PortfolioOverride = {
      id: existing ? (existing as { id: string }).id : crypto.randomUUID(),
      user_id: user.id,
      use_manual_override: input.useManualOverride,
      manual_usd_sgd_rate: DEFAULT_USD_SGD_RATE,
      manual_total_portfolio_value_sgd: derivedTotal,
      manual_stocks_value_sgd: input.manualUsStocksOptionsSgdEquivalent,
      manual_etfs_value_sgd: null,
      manual_crypto_value_sgd: input.manualCryptoValueSgd,
      manual_cash_value_sgd: null,
      manual_us_stocks_options_value_usd: input.manualUsStocksOptionsValueUsd,
      manual_us_stocks_options_sgd_equivalent:
        input.manualUsStocksOptionsSgdEquivalent,
      manual_sg_stocks_cash_value_sgd: input.manualSgStocksCashValueSgd,
      override_reason: input.overrideReason,
      override_updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("portfolio_overrides")
      .upsert(payload as never, { onConflict: "user_id" });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/");
    const updated = await getPortfolioDashboardData();
    const tradesData = await getOptionsTradesData();
    await upsertDailyPortfolioSnapshot({
      userId: user.id,
      metrics: updated,
      trades: tradesData.trades,
    });
    return { success: true, metrics: updated };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save override.",
    };
  }
}

export async function getMockOverrideDefaults(): Promise<PortfolioOverrideInput> {
  return MOCK_PORTFOLIO_OVERRIDE;
}
