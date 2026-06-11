"use server";

import {
  buildCalculatedValues,
  buildPortfolioMetrics,
} from "@/lib/portfolio/calculations";
import { DEFAULT_USD_SGD_RATE } from "@/lib/portfolio/currency";
import { mergePortfolioOverrideRow } from "@/lib/portfolio/override-row";
import { sumManualOverallPortfolioValueSgd } from "@/lib/portfolio/manual-breakdown";
import { MOCK_PORTFOLIO_OVERRIDE, MOCK_PORTFOLIO_RAW } from "@/lib/mock/portfolio";
import type { PortfolioMetrics, PortfolioOverrideInput } from "@/lib/portfolio/types";
import { getPortfolioDashboardData } from "@/lib/supabase/queries/portfolio";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  NotAuthenticatedError,
  SUPABASE_AUTH_SESSION_REQUIRED_MESSAGE,
  resolveSupabaseServerAccess,
} from "@/lib/supabase/resolve-user";
import {
  getServerSupabaseClient,
  type ServerSupabaseClient,
} from "@/lib/supabase/server-write";
import { revalidatePath } from "next/cache";
import type { PortfolioOverride } from "@/types/database";

async function getPortfolioOverrideWriteContext(): Promise<{
  supabase: ServerSupabaseClient;
  userId: string;
}> {
  const access = await resolveSupabaseServerAccess();
  if (!access) {
    throw new NotAuthenticatedError(SUPABASE_AUTH_SESSION_REQUIRED_MESSAGE);
  }
  const supabase = await getServerSupabaseClient(access);
  return { supabase, userId: access.userId };
}

type EnrichedCapitalPools = Awaited<
  ReturnType<
    typeof import("@/lib/portfolio/enrich-capital-pools").getEnrichedPortfolioMetrics
  >
>["capitalPools"];

export type PortfolioOverrideActionResult =
  | { success: true; metrics: PortfolioMetrics; capitalPools: EnrichedCapitalPools }
  | { success: false; error: string };

export type ManualTradingCashActionResult =
  | { success: true; metrics: PortfolioMetrics; capitalPools: EnrichedCapitalPools }
  | { success: false; error: string };

function sumManualOverallFromInput(
  input: PortfolioOverrideInput
): number | null {
  return sumManualOverallPortfolioValueSgd({
    usStocksOptionsSgdEquivalent: input.manualUsStocksOptionsSgdEquivalent,
    cryptoValueSgd: input.manualCryptoValueSgd,
    sgStocksValueSgd: input.manualSgStocksValueSgd,
    sgCashValueSgd: input.manualSgCashValueSgd,
    tradingCashSgd: input.manualTradingCashSgd,
  });
}

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
    const { supabase, userId } = await getPortfolioOverrideWriteContext();
    const { data: existing } = await supabase
      .from("portfolio_overrides")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const row = existing as PortfolioOverride | null;
    const payload = mergePortfolioOverrideRow(userId, row, {
      manual_cash_value_sgd: input.tradingCashSgd,
      manual_trading_cash_usd: input.tradingCashUsd,
      manual_trading_cash_sgd: input.tradingCashSgd,
      override_updated_at: new Date().toISOString(),
    });

    const { error } = await supabase
      .from("portfolio_overrides")
      .upsert(payload as never, { onConflict: "user_id" });

    if (error) return { success: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/risk");
    revalidatePath("/goals");
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

export async function saveManualCryptoCash(input: {
  cryptoCashSgd: number;
}): Promise<ManualTradingCashActionResult> {
  if (!isSupabaseConfigured()) {
    MOCK_PORTFOLIO_OVERRIDE.manualCryptoCashSgd = input.cryptoCashSgd;
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
    const { supabase, userId } = await getPortfolioOverrideWriteContext();
    const { data: existing } = await supabase
      .from("portfolio_overrides")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const row = existing as PortfolioOverride | null;
    const holdings =
      row?.manual_crypto_holdings_sgd != null
        ? Number(row.manual_crypto_holdings_sgd)
        : null;
    const payload = mergePortfolioOverrideRow(userId, row, {
      manual_crypto_value_sgd:
        holdings != null ? holdings + input.cryptoCashSgd : row?.manual_crypto_value_sgd ?? null,
      manual_crypto_cash_sgd: input.cryptoCashSgd,
      override_updated_at: new Date().toISOString(),
    });

    const { error } = await supabase
      .from("portfolio_overrides")
      .upsert(payload as never, { onConflict: "user_id" });

    if (error) return { success: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/risk");
    revalidatePath("/goals");
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
      error: e instanceof Error ? e.message : "Failed to save crypto cash.",
    };
  }
}

export async function savePortfolioOverride(
  input: PortfolioOverrideInput
): Promise<PortfolioOverrideActionResult> {
  const { getEnrichedPortfolioMetrics } = await import(
    "@/lib/portfolio/enrich-capital-pools"
  );

  if (!isSupabaseConfigured()) {
    MOCK_PORTFOLIO_OVERRIDE.useManualOverride = input.useManualOverride;
    MOCK_PORTFOLIO_OVERRIDE.manualUsStocksOptionsValueUsd =
      input.manualUsStocksOptionsValueUsd;
    MOCK_PORTFOLIO_OVERRIDE.manualUsStocksOptionsSgdEquivalent =
      input.manualUsStocksOptionsSgdEquivalent;
    MOCK_PORTFOLIO_OVERRIDE.manualCryptoValueSgd = input.manualCryptoValueSgd;
    MOCK_PORTFOLIO_OVERRIDE.manualSgStocksCashValueSgd =
      input.manualSgStocksCashValueSgd;
    MOCK_PORTFOLIO_OVERRIDE.manualSgStocksValueSgd =
      input.manualSgStocksValueSgd;
    MOCK_PORTFOLIO_OVERRIDE.manualSgCashValueSgd = input.manualSgCashValueSgd;
    MOCK_PORTFOLIO_OVERRIDE.manualTradingCashUsd =
      input.manualTradingCashUsd ?? MOCK_PORTFOLIO_OVERRIDE.manualTradingCashUsd;
    MOCK_PORTFOLIO_OVERRIDE.manualTradingCashSgd =
      input.manualTradingCashSgd ?? MOCK_PORTFOLIO_OVERRIDE.manualTradingCashSgd;
    MOCK_PORTFOLIO_OVERRIDE.overrideReason = input.overrideReason;
    MOCK_PORTFOLIO_OVERRIDE.overrideUpdatedAt = new Date().toISOString();
    MOCK_PORTFOLIO_OVERRIDE.manualTotalPortfolioValueSgd =
      input.manualTotalPortfolioValueSgd ??
      (input.useManualOverride
        ? sumManualOverallFromInput(input)
        : null);

    const enriched = await getEnrichedPortfolioMetrics();
    return {
      success: true,
      metrics: enriched.metrics,
      capitalPools: enriched.capitalPools,
    };
  }

  try {
    const { supabase, userId } = await getPortfolioOverrideWriteContext();

    const { data: existing } = await supabase
      .from("portfolio_overrides")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const metrics = await getPortfolioDashboardData();
    const calculated = buildCalculatedValues(metrics.holdings);
    const manualOverallSgd =
      input.manualTotalPortfolioValueSgd ?? sumManualOverallFromInput(input);
    const derivedTotal = input.useManualOverride
      ? manualOverallSgd ?? calculated.portfolioValue
      : calculated.portfolioValue;

    const existingRow = existing as PortfolioOverride | null;
    const sgCombined =
      input.manualSgStocksValueSgd != null || input.manualSgCashValueSgd != null
        ? (input.manualSgStocksValueSgd ?? 0) + (input.manualSgCashValueSgd ?? 0)
        : input.manualSgStocksCashValueSgd;

    const payload = mergePortfolioOverrideRow(userId, existingRow, {
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
      manual_sg_stocks_cash_value_sgd: sgCombined ?? null,
      manual_sg_stocks_value_sgd: input.manualSgStocksValueSgd,
      manual_sg_cash_value_sgd: input.manualSgCashValueSgd,
      manual_trading_cash_usd: input.manualTradingCashUsd,
      manual_trading_cash_sgd: input.manualTradingCashSgd,
      manual_crypto_cash_sgd: existingRow?.manual_crypto_cash_sgd ?? 0,
      manual_crypto_holdings_sgd: existingRow?.manual_crypto_holdings_sgd ?? null,
      manual_crypto_contributions_sgd:
        existingRow?.manual_crypto_contributions_sgd ?? null,
      manual_client_portfolio_sgd:
        existingRow?.manual_client_portfolio_sgd ?? 0,
      override_reason: input.overrideReason,
      override_updated_at: new Date().toISOString(),
    });

    const { error } = await supabase
      .from("portfolio_overrides")
      .upsert(payload as never, { onConflict: "user_id" });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/");
    revalidatePath("/goals");
    const enriched = await getEnrichedPortfolioMetrics();
    return {
      success: true,
      metrics: enriched.metrics,
      capitalPools: enriched.capitalPools,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save override.",
    };
  }
}

export async function saveManualClientPortfolio(input: {
  clientPortfolioSgd: number;
}): Promise<ManualTradingCashActionResult> {
  if (!isSupabaseConfigured()) {
    MOCK_PORTFOLIO_OVERRIDE.manualClientPortfolioSgd = input.clientPortfolioSgd;
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
    const { supabase, userId } = await getPortfolioOverrideWriteContext();
    const { data: existing } = await supabase
      .from("portfolio_overrides")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const row = existing as PortfolioOverride | null;
    const payload = mergePortfolioOverrideRow(userId, row, {
      manual_client_portfolio_sgd: input.clientPortfolioSgd,
      override_updated_at: new Date().toISOString(),
    });

    const { error } = await supabase
      .from("portfolio_overrides")
      .upsert(payload as never, { onConflict: "user_id" });

    if (error) return { success: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/risk");
    revalidatePath("/goals");
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
      error: e instanceof Error ? e.message : "Failed to save client portfolio.",
    };
  }
}

export async function getMockOverrideDefaults(): Promise<PortfolioOverrideInput> {
  return MOCK_PORTFOLIO_OVERRIDE;
}
