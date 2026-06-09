"use server";

import { cryptoRowFromForm } from "@/lib/crypto/map-holding";
import { applyComputedCryptoTotalsToOverride } from "@/lib/crypto/sync-portfolio-totals";
import type { CryptoActionResult, CryptoHoldingFormInput } from "@/lib/crypto/types";
import { MOCK_PORTFOLIO_OVERRIDE } from "@/lib/mock/portfolio";
import { DEFAULT_USD_SGD_RATE } from "@/lib/portfolio/currency";
import type { PortfolioOverrideInput } from "@/lib/portfolio/types";
import {
  buildCryptoTrackerPageData,
  getCryptoHoldingsRows,
  getCryptoTrackerData,
  persistCryptoHolding,
  removeCryptoHolding,
} from "@/lib/supabase/queries/crypto-holdings";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  NotAuthenticatedError,
  SUPABASE_AUTH_SESSION_REQUIRED_MESSAGE,
  requireUserId,
  resolveSupabaseServerAccess,
} from "@/lib/supabase/resolve-user";
import {
  getServerSupabaseClient,
  type ServerSupabaseClient,
} from "@/lib/supabase/server-write";
import type { PortfolioOverride } from "@/types/database";
import { revalidatePath } from "next/cache";

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

async function finish(): Promise<CryptoActionResult> {
  const { getEnrichedPortfolioMetrics } = await import(
    "@/lib/portfolio/enrich-capital-pools"
  );
  const enriched = await getEnrichedPortfolioMetrics();
  const data = await buildCryptoTrackerPageData(
    enriched.metrics.override,
    enriched.capitalPools
  );
  revalidatePath("/crypto");
  revalidatePath("/");
  revalidatePath("/data-health");
  return { success: true, data };
}

async function syncCryptoOverrideFromRows(
  cryptoCashSgd: number,
  totalContributionsSgd?: number | null
): Promise<void> {
  const rows = await getCryptoHoldingsRows();
  const totals = applyComputedCryptoTotalsToOverride(
    {
      useManualOverride: MOCK_PORTFOLIO_OVERRIDE.useManualOverride,
      manualUsStocksOptionsValueUsd:
        MOCK_PORTFOLIO_OVERRIDE.manualUsStocksOptionsValueUsd,
      manualUsStocksOptionsSgdEquivalent:
        MOCK_PORTFOLIO_OVERRIDE.manualUsStocksOptionsSgdEquivalent,
      manualCryptoValueSgd: MOCK_PORTFOLIO_OVERRIDE.manualCryptoValueSgd,
      manualSgStocksCashValueSgd:
        MOCK_PORTFOLIO_OVERRIDE.manualSgStocksCashValueSgd,
      manualSgStocksValueSgd: MOCK_PORTFOLIO_OVERRIDE.manualSgStocksValueSgd,
      manualSgCashValueSgd: MOCK_PORTFOLIO_OVERRIDE.manualSgCashValueSgd,
      manualTradingCashUsd: MOCK_PORTFOLIO_OVERRIDE.manualTradingCashUsd,
      manualTradingCashSgd: MOCK_PORTFOLIO_OVERRIDE.manualTradingCashSgd,
      manualCryptoCashSgd: cryptoCashSgd,
      manualCryptoHoldingsSgd: MOCK_PORTFOLIO_OVERRIDE.manualCryptoHoldingsSgd,
      manualCryptoContributionsSgd:
        totalContributionsSgd ??
        MOCK_PORTFOLIO_OVERRIDE.manualCryptoContributionsSgd,
      manualClientPortfolioSgd: MOCK_PORTFOLIO_OVERRIDE.manualClientPortfolioSgd,
      manualUsdSgdRate: MOCK_PORTFOLIO_OVERRIDE.manualUsdSgdRate,
      manualTotalPortfolioValueSgd:
        MOCK_PORTFOLIO_OVERRIDE.manualTotalPortfolioValueSgd,
      overrideReason: MOCK_PORTFOLIO_OVERRIDE.overrideReason,
      overrideUpdatedAt: MOCK_PORTFOLIO_OVERRIDE.overrideUpdatedAt,
    },
    rows,
    cryptoCashSgd
  );

  Object.assign(MOCK_PORTFOLIO_OVERRIDE, totals);
  if (totalContributionsSgd != null) {
    MOCK_PORTFOLIO_OVERRIDE.manualCryptoContributionsSgd = totalContributionsSgd;
  }
}

async function persistSyncedCryptoOverride(
  cryptoCashSgd: number,
  totalContributionsSgd: number
): Promise<{ success: true } | { success: false; error: string }> {
  const rows = await getCryptoHoldingsRows();

  if (!isSupabaseConfigured()) {
    await syncCryptoOverrideFromRows(cryptoCashSgd, totalContributionsSgd);
    return { success: true };
  }

  try {
    const { supabase, userId } = await getPortfolioOverrideWriteContext();
    const { data: existing } = await supabase
      .from("portfolio_overrides")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const row = existing as PortfolioOverride | null;
    const base: PortfolioOverrideInput = {
      useManualOverride: row?.use_manual_override ?? false,
      manualUsStocksOptionsValueUsd: row?.manual_us_stocks_options_value_usd ?? null,
      manualUsStocksOptionsSgdEquivalent:
        row?.manual_us_stocks_options_sgd_equivalent ?? null,
      manualCryptoValueSgd: row?.manual_crypto_value_sgd ?? null,
      manualSgStocksCashValueSgd: row?.manual_sg_stocks_cash_value_sgd ?? null,
      manualSgStocksValueSgd: row?.manual_sg_stocks_value_sgd ?? null,
      manualSgCashValueSgd: row?.manual_sg_cash_value_sgd ?? null,
      manualTradingCashUsd: row?.manual_trading_cash_usd ?? null,
      manualTradingCashSgd: row?.manual_trading_cash_sgd ?? null,
      manualCryptoCashSgd: cryptoCashSgd,
      manualCryptoHoldingsSgd: row?.manual_crypto_holdings_sgd ?? null,
      manualCryptoContributionsSgd: totalContributionsSgd,
      manualClientPortfolioSgd: row?.manual_client_portfolio_sgd ?? 0,
      manualUsdSgdRate: row?.manual_usd_sgd_rate ?? DEFAULT_USD_SGD_RATE,
      manualTotalPortfolioValueSgd: row?.manual_total_portfolio_value_sgd ?? null,
      overrideReason: row?.override_reason ?? null,
      overrideUpdatedAt: row?.override_updated_at ?? null,
    };

    const synced = applyComputedCryptoTotalsToOverride(
      base,
      rows,
      cryptoCashSgd
    );
    synced.manualCryptoContributionsSgd = totalContributionsSgd;

    const payload: PortfolioOverride = {
      id: row?.id ?? crypto.randomUUID(),
      user_id: userId,
      use_manual_override: synced.useManualOverride,
      manual_usd_sgd_rate: synced.manualUsdSgdRate,
      manual_total_portfolio_value_sgd: synced.manualTotalPortfolioValueSgd,
      manual_stocks_value_sgd: row?.manual_stocks_value_sgd ?? null,
      manual_etfs_value_sgd: row?.manual_etfs_value_sgd ?? null,
      manual_crypto_value_sgd: synced.manualCryptoValueSgd,
      manual_cash_value_sgd: row?.manual_cash_value_sgd ?? null,
      manual_us_stocks_options_value_usd: synced.manualUsStocksOptionsValueUsd,
      manual_us_stocks_options_sgd_equivalent:
        synced.manualUsStocksOptionsSgdEquivalent,
      manual_sg_stocks_cash_value_sgd: synced.manualSgStocksCashValueSgd,
      manual_sg_stocks_value_sgd: synced.manualSgStocksValueSgd,
      manual_sg_cash_value_sgd: synced.manualSgCashValueSgd,
      manual_trading_cash_usd: synced.manualTradingCashUsd,
      manual_trading_cash_sgd: synced.manualTradingCashSgd,
      manual_crypto_cash_sgd: synced.manualCryptoCashSgd,
      manual_crypto_holdings_sgd: synced.manualCryptoHoldingsSgd,
      manual_crypto_contributions_sgd: synced.manualCryptoContributionsSgd,
      manual_client_portfolio_sgd: synced.manualClientPortfolioSgd,
      override_reason: synced.overrideReason,
      override_updated_at: synced.overrideUpdatedAt ?? new Date().toISOString(),
      created_at: row?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("portfolio_overrides")
      .upsert(payload as never, { onConflict: "user_id" });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error
          ? e.message
          : "Failed to sync crypto portfolio totals.",
    };
  }
}

async function syncCryptoOverrideAfterHoldingChange(): Promise<
  { success: true } | { success: false; error: string }
> {
  const cashSgd = MOCK_PORTFOLIO_OVERRIDE.manualCryptoCashSgd ?? 0;
  const contributionsSgd =
    MOCK_PORTFOLIO_OVERRIDE.manualCryptoContributionsSgd ?? 0;

  if (!isSupabaseConfigured()) {
    await syncCryptoOverrideFromRows(cashSgd, contributionsSgd);
    return { success: true };
  }

  try {
    const { supabase, userId } = await getPortfolioOverrideWriteContext();
    const { data: existing } = await supabase
      .from("portfolio_overrides")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const row = existing as PortfolioOverride | null;
    return persistSyncedCryptoOverride(
      row?.manual_crypto_cash_sgd ?? 0,
      row?.manual_crypto_contributions_sgd ?? 0
    );
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Failed to sync crypto holdings total.",
    };
  }
}

export async function saveCryptoManualTotals(input: {
  cryptoCashSgd: number;
  totalContributionsSgd: number;
}): Promise<CryptoActionResult> {
  const syncResult = await persistSyncedCryptoOverride(
    input.cryptoCashSgd,
    input.totalContributionsSgd
  );

  if (!syncResult.success) {
    return { success: false, error: syncResult.error };
  }

  return finish();
}

export async function createCryptoHolding(
  input: CryptoHoldingFormInput
): Promise<CryptoActionResult> {
  try {
    const userId = await requireUserId();
    const row = cryptoRowFromForm(input, userId);
    await persistCryptoHolding(row, userId);
    const syncResult = await syncCryptoOverrideAfterHoldingChange();
    if (!syncResult.success) {
      return { success: false, error: syncResult.error };
    }
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add crypto holding.",
    };
  }
}

export async function updateCryptoHolding(
  id: string,
  input: CryptoHoldingFormInput,
  createdAt?: string
): Promise<CryptoActionResult> {
  try {
    const userId = await requireUserId();
    const row = cryptoRowFromForm(input, userId, id, createdAt);
    await persistCryptoHolding(row, userId);
    const syncResult = await syncCryptoOverrideAfterHoldingChange();
    if (!syncResult.success) {
      return { success: false, error: syncResult.error };
    }
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update crypto holding.",
    };
  }
}

export async function deleteCryptoHolding(
  id: string
): Promise<CryptoActionResult> {
  try {
    const userId = await requireUserId();
    await removeCryptoHolding(id, userId);
    const syncResult = await syncCryptoOverrideAfterHoldingChange();
    if (!syncResult.success) {
      return { success: false, error: syncResult.error };
    }
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete crypto holding.",
    };
  }
}

/** @deprecated Use buildCryptoTrackerPageData from dashboard — kept for legacy callers */
export { getCryptoTrackerData };
