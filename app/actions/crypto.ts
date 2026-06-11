"use server";

import { cryptoRowFromForm } from "@/lib/crypto/map-holding";
import { applyComputedCryptoTotalsToOverride } from "@/lib/crypto/sync-portfolio-totals";
import type {
  CryptoActionResult,
  CryptoBuyInput,
  CryptoDepositInput,
  CryptoFeeInput,
  CryptoHoldingFormInput,
  CryptoManualAdjustmentInput,
  CryptoSellInput,
} from "@/lib/crypto/types";
import {
  CryptoTransactionError,
  processCryptoBuy,
  processCryptoDeposit,
  processCryptoFee,
  processCryptoManualAdjustment,
  processCryptoManualCashUpdate,
  processCryptoSell,
} from "@/lib/crypto/transaction-service";
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
import { removeCryptoTransaction } from "@/lib/supabase/queries/crypto-transactions";
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
  revalidatePath("/goals");
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
      stock_etf_tracking_mode: row?.stock_etf_tracking_mode ?? "manual",
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
  if (!isSupabaseConfigured()) {
    const cashSgd = MOCK_PORTFOLIO_OVERRIDE.manualCryptoCashSgd ?? 0;
    const contributionsSgd =
      MOCK_PORTFOLIO_OVERRIDE.manualCryptoContributionsSgd ?? 0;
    await syncCryptoOverrideFromRows(cashSgd, contributionsSgd);
    return { success: true };
  }

  try {
    const { cashSgd, contributionsSgd } = await getCurrentCryptoBalances();
    return persistSyncedCryptoOverride(cashSgd, contributionsSgd);
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Failed to sync crypto holdings total.",
    };
  }
}

async function getCurrentCryptoBalances(): Promise<{
  cashSgd: number;
  contributionsSgd: number;
}> {
  if (!isSupabaseConfigured()) {
    return {
      cashSgd: MOCK_PORTFOLIO_OVERRIDE.manualCryptoCashSgd ?? 0,
      contributionsSgd:
        MOCK_PORTFOLIO_OVERRIDE.manualCryptoContributionsSgd ?? 0,
    };
  }

  const { supabase, userId } = await getPortfolioOverrideWriteContext();
  const { data: existing } = await supabase
    .from("portfolio_overrides")
    .select("manual_crypto_cash_sgd, manual_crypto_contributions_sgd")
    .eq("user_id", userId)
    .maybeSingle();

  const row = existing as {
    manual_crypto_cash_sgd: number | null;
    manual_crypto_contributions_sgd: number | null;
  } | null;

  return {
    cashSgd: row?.manual_crypto_cash_sgd ?? 0,
    contributionsSgd: row?.manual_crypto_contributions_sgd ?? 0,
  };
}

async function persistCryptoCashAndContributions(
  cashSgd: number,
  contributionsSgd: number
): Promise<{ success: true } | { success: false; error: string }> {
  return persistSyncedCryptoOverride(cashSgd, contributionsSgd);
}

function mapTransactionError(e: unknown): CryptoActionResult {
  if (e instanceof CryptoTransactionError) {
    return { success: false, error: e.message };
  }
  return {
    success: false,
    error: e instanceof Error ? e.message : "Crypto transaction failed.",
  };
}

export async function saveCryptoManualTotals(input: {
  cryptoCashSgd: number;
  totalContributionsSgd: number;
  notes?: string | null;
}): Promise<CryptoActionResult> {
  try {
    const userId = await requireUserId();
    const current = await getCurrentCryptoBalances();
    const today = new Date().toISOString().split("T")[0];

    if (
      current.cashSgd !== input.cryptoCashSgd ||
      current.contributionsSgd !== input.totalContributionsSgd
    ) {
      await processCryptoManualCashUpdate({
        userId,
        transactionDate: today,
        oldCashSgd: current.cashSgd,
        newCashSgd: input.cryptoCashSgd,
        oldContributionsSgd: current.contributionsSgd,
        newContributionsSgd: input.totalContributionsSgd,
        notes: input.notes ?? null,
      });
    }

    const syncResult = await persistCryptoCashAndContributions(
      input.cryptoCashSgd,
      input.totalContributionsSgd
    );

    if (!syncResult.success) {
      return { success: false, error: syncResult.error };
    }

    return finish();
  } catch (e) {
    return mapTransactionError(e);
  }
}

export async function recordCryptoDeposit(
  payload: CryptoDepositInput
): Promise<CryptoActionResult> {
  try {
    const userId = await requireUserId();
    const current = await getCurrentCryptoBalances();
    const next = await processCryptoDeposit({
      userId,
      payload,
      transactionType: "deposit",
      cashSgd: current.cashSgd,
      contributionsSgd: current.contributionsSgd,
    });
    const syncResult = await persistCryptoCashAndContributions(
      next.cashSgd,
      next.contributionsSgd
    );
    if (!syncResult.success) {
      return { success: false, error: syncResult.error };
    }
    return finish();
  } catch (e) {
    return mapTransactionError(e);
  }
}

export async function recordCryptoMonthlyContribution(
  payload: CryptoDepositInput
): Promise<CryptoActionResult> {
  try {
    const userId = await requireUserId();
    const current = await getCurrentCryptoBalances();
    const next = await processCryptoDeposit({
      userId,
      payload,
      transactionType: "monthly_contribution",
      cashSgd: current.cashSgd,
      contributionsSgd: current.contributionsSgd,
    });
    const syncResult = await persistCryptoCashAndContributions(
      next.cashSgd,
      next.contributionsSgd
    );
    if (!syncResult.success) {
      return { success: false, error: syncResult.error };
    }
    return finish();
  } catch (e) {
    return mapTransactionError(e);
  }
}

export async function recordCryptoBuy(
  payload: CryptoBuyInput
): Promise<CryptoActionResult> {
  try {
    const userId = await requireUserId();
    const current = await getCurrentCryptoBalances();
    const nextCash = await processCryptoBuy({
      userId,
      payload,
      cashSgd: current.cashSgd,
    });
    const syncResult = await persistCryptoCashAndContributions(
      nextCash,
      current.contributionsSgd
    );
    if (!syncResult.success) {
      return { success: false, error: syncResult.error };
    }
    const holdingsSync = await syncCryptoOverrideAfterHoldingChange();
    if (!holdingsSync.success) {
      return { success: false, error: holdingsSync.error };
    }
    return finish();
  } catch (e) {
    return mapTransactionError(e);
  }
}

export async function recordCryptoSell(
  payload: CryptoSellInput
): Promise<CryptoActionResult> {
  try {
    const userId = await requireUserId();
    const current = await getCurrentCryptoBalances();
    const nextCash = await processCryptoSell({
      userId,
      payload,
      cashSgd: current.cashSgd,
    });
    const syncResult = await persistCryptoCashAndContributions(
      nextCash,
      current.contributionsSgd
    );
    if (!syncResult.success) {
      return { success: false, error: syncResult.error };
    }
    const holdingsSync = await syncCryptoOverrideAfterHoldingChange();
    if (!holdingsSync.success) {
      return { success: false, error: holdingsSync.error };
    }
    return finish();
  } catch (e) {
    return mapTransactionError(e);
  }
}

export async function recordCryptoFee(
  payload: CryptoFeeInput
): Promise<CryptoActionResult> {
  try {
    const userId = await requireUserId();
    const current = await getCurrentCryptoBalances();
    const nextCash = await processCryptoFee({
      userId,
      payload,
      cashSgd: current.cashSgd,
    });
    const syncResult = await persistCryptoCashAndContributions(
      nextCash,
      current.contributionsSgd
    );
    if (!syncResult.success) {
      return { success: false, error: syncResult.error };
    }
    return finish();
  } catch (e) {
    return mapTransactionError(e);
  }
}

export async function applyCryptoManualAdjustment(
  payload: CryptoManualAdjustmentInput
): Promise<CryptoActionResult> {
  try {
    const userId = await requireUserId();
    await processCryptoManualAdjustment({ userId, payload });
    const syncResult = await syncCryptoOverrideAfterHoldingChange();
    if (!syncResult.success) {
      return { success: false, error: syncResult.error };
    }
    return finish();
  } catch (e) {
    return mapTransactionError(e);
  }
}

export async function deleteCryptoTransaction(
  id: string
): Promise<CryptoActionResult> {
  try {
    const userId = await requireUserId();
    await removeCryptoTransaction(id, userId);
    return finish();
  } catch (e) {
    return mapTransactionError(e);
  }
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
