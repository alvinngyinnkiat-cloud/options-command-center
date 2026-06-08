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
import { requireUserId } from "@/lib/supabase/resolve-user";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { PortfolioOverride } from "@/types/database";

export type PortfolioOverrideActionResult =
  | { success: true; metrics: PortfolioMetrics }
  | { success: false; error: string };

export type ManualTradingCashActionResult =
  | {
      success: true;
      metrics: PortfolioMetrics;
      capitalPools: Awaited<
        ReturnType<
          typeof import("@/lib/portfolio/enrich-capital-pools").getEnrichedPortfolioMetrics
        >
      >["capitalPools"];
    }
  | { success: false; error: string };

export async function saveManualTradingCash(input: {
  tradingCashUsd: number;
  tradingCashSgd: number;
}): Promise<ManualTradingCashActionResult> {
  if (!isSupabaseConfigured()) {
    MOCK_PORTFOLIO_OVERRIDE.manualTradingCashUsd = input.tradingCashUsd;
    MOCK_PORTFOLIO_OVERRIDE.manualTradingCashSgd = input.tradingCashSgd;
    MOCK_PORTFOLIO_OVERRIDE.overrideUpdatedAt = new Date().toISOString();
    const { getEnrichedPortfolioMetrics } = await import(
      "@/lib/portfolio/enrich-capital-pools"
    );
    const enriched = await getEnrichedPortfolioMetrics();
    return {
      success: true,
      metrics: enriched.metrics,
      capitalPools: enriched.capitalPools,
    };
  }

  try {
    const userId = await requireUserId();
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("portfolio_overrides")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const row = existing as PortfolioOverride | null;
    const payload: PortfolioOverride = {
      id: row?.id ?? crypto.randomUUID(),
      user_id: userId,
      use_manual_override: row?.use_manual_override ?? false,
      manual_usd_sgd_rate: row?.manual_usd_sgd_rate ?? DEFAULT_USD_SGD_RATE,
      manual_total_portfolio_value_sgd: row?.manual_total_portfolio_value_sgd ?? null,
      manual_stocks_value_sgd: row?.manual_stocks_value_sgd ?? null,
      manual_etfs_value_sgd: row?.manual_etfs_value_sgd ?? null,
      manual_crypto_value_sgd: row?.manual_crypto_value_sgd ?? null,
      manual_cash_value_sgd: input.tradingCashSgd,
      manual_us_stocks_options_value_usd: row?.manual_us_stocks_options_value_usd ?? null,
      manual_us_stocks_options_sgd_equivalent:
        row?.manual_us_stocks_options_sgd_equivalent ?? null,
      manual_sg_stocks_cash_value_sgd: row?.manual_sg_stocks_cash_value_sgd ?? null,
      manual_trading_cash_usd: input.tradingCashUsd,
      manual_trading_cash_sgd: input.tradingCashSgd,
      override_reason: row?.override_reason ?? null,
      override_updated_at: new Date().toISOString(),
      created_at: row?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("portfolio_overrides")
      .upsert(payload as never, { onConflict: "user_id" });

    if (error) return { success: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/risk");
    const { getEnrichedPortfolioMetrics } = await import(
      "@/lib/portfolio/enrich-capital-pools"
    );
    const enriched = await getEnrichedPortfolioMetrics();
    return {
      success: true,
      metrics: enriched.metrics,
      capitalPools: enriched.capitalPools,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save trading cash.",
    };
  }
}

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
    const userId = await requireUserId();
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("portfolio_overrides")
      .select("id")
      .eq("user_id", userId)
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

    const existingRow = existing as PortfolioOverride | null;

    const payload: PortfolioOverride = {
      id: existingRow?.id ?? crypto.randomUUID(),
      user_id: userId,
      use_manual_override: input.useManualOverride,
      manual_usd_sgd_rate: DEFAULT_USD_SGD_RATE,
      manual_total_portfolio_value_sgd: derivedTotal,
      manual_stocks_value_sgd: input.manualUsStocksOptionsSgdEquivalent,
      manual_etfs_value_sgd: null,
      manual_crypto_value_sgd: input.manualCryptoValueSgd,
      manual_cash_value_sgd: input.manualTradingCashSgd,
      manual_us_stocks_options_value_usd: input.manualUsStocksOptionsValueUsd,
      manual_us_stocks_options_sgd_equivalent:
        input.manualUsStocksOptionsSgdEquivalent,
      manual_sg_stocks_cash_value_sgd: input.manualSgStocksCashValueSgd,
      manual_trading_cash_usd:
        input.manualTradingCashUsd ?? existingRow?.manual_trading_cash_usd ?? null,
      manual_trading_cash_sgd:
        input.manualTradingCashSgd ?? existingRow?.manual_trading_cash_sgd ?? null,
      override_reason: input.overrideReason,
      override_updated_at: new Date().toISOString(),
      created_at: existingRow?.created_at ?? new Date().toISOString(),
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
      userId,
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
