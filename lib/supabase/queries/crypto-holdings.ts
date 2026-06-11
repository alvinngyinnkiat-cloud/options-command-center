import { buildCryptoTrackerSummary, buildCryptoPortfolioManualFromTracker } from "@/lib/crypto/calculations";
import {
  buildCryptoDeploymentPlan,
  buildCoinHoldingsTotal,
  buildCryptoTierGroups,
  tierGroupsToAllocationSlices,
} from "@/lib/crypto/allocation";
import { calculateTotalFeesPaid } from "@/lib/crypto/transaction-types";
import { splitCryptoTrackerValues, resolveCryptoCashSgd } from "@/lib/portfolio/capital-pools";
import { enrichAllCryptoHoldings } from "@/lib/crypto/map-holding";
import type { CryptoTrackerData } from "@/lib/crypto/types";
import {
  deleteMockCryptoHolding,
  getMockCryptoHoldings,
  upsertMockCryptoHolding,
} from "@/lib/mock/crypto-store";
import { getMockCryptoTransactions } from "@/lib/mock/crypto-transaction-store";
import { fetchCryptoTransactions } from "@/lib/supabase/queries/crypto-transactions";
import { readSupabasePrimary } from "@/lib/supabase/data-access";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  MOCK_USER_ID,
  warnMissingDevUserIdForWrite,
  withSupabaseQuery,
} from "@/lib/supabase/resolve-user";
import type { CryptoHolding } from "@/types/database";

function buildData(
  rows: CryptoHolding[],
  dataSource: "supabase" | "mock",
  override?: import("@/lib/portfolio/types").PortfolioOverrideInput | null,
  pools?: { cryptoHoldingsSgd: number; cryptoCashSgd: number },
  transactions = dataSource === "mock"
    ? getMockCryptoTransactions()
    : ([] as import("@/types/database").CryptoTransaction[])
): CryptoTrackerData {
  const split = splitCryptoTrackerValues(rows);
  const cryptoCashSgd =
    pools?.cryptoCashSgd ??
    resolveCryptoCashSgd(override ?? null, split.cryptoCashSgd);
  const totalPortfolio =
    (pools?.cryptoHoldingsSgd ?? split.cryptoHoldingsSgd) + cryptoCashSgd;
  const holdings = enrichAllCryptoHoldings(rows, totalPortfolio);
  const cryptoHoldingsSgd = buildCoinHoldingsTotal(holdings);
  const portfolioManual = buildCryptoPortfolioManualFromTracker({
    override: override ?? null,
    cryptoHoldingsValueSgd: cryptoHoldingsSgd,
    cryptoCashSgd,
    holdings,
  });
  const totalFeesPaidSgd = calculateTotalFeesPaid(transactions);

  const tierGroups = buildCryptoTierGroups(
    holdings,
    cryptoCashSgd,
    cryptoHoldingsSgd + cryptoCashSgd
  );

  return {
    holdings,
    summary: buildCryptoTrackerSummary(holdings),
    portfolioManual: {
      ...portfolioManual,
      cryptoHoldingsValueSgd: cryptoHoldingsSgd,
      totalFeesPaidSgd,
    },
    allocationSlices: tierGroupsToAllocationSlices(tierGroups),
    tierGroups,
    deploymentPlan: buildCryptoDeploymentPlan(cryptoCashSgd),
    transactions,
    dataSource,
  };
}

export async function buildCryptoTrackerPageData(
  override: import("@/lib/portfolio/types").PortfolioOverrideInput | null,
  pools: { cryptoHoldingsSgd: number; cryptoCashSgd: number }
): Promise<CryptoTrackerData> {
  const transactions = await fetchCryptoTransactions();
  const { value, dataSource } = await readSupabasePrimary({
    module: "buildCryptoTrackerPageData",
    mock: () => buildData([], "mock", override, pools, transactions),
    empty: () => buildData([], "supabase", override, pools, transactions),
    read: async (userId) =>
      buildData(await fetchCryptoRows(userId), "supabase", override, pools, transactions),
  });

  return { ...value, dataSource, transactions };
}

async function fetchCryptoRows(_userId: string): Promise<CryptoHolding[]> {
  return withSupabaseQuery(
    async ({ userId, supabase }) => {
      const { data, error } = await supabase
        .from("crypto_holdings")
        .select("*")
        .eq("user_id", userId)
        .order("current_value_sgd", { ascending: false });

      if (error) return [];
      return (data ?? []) as CryptoHolding[];
    },
    () => []
  );
}

export async function getCryptoHoldingsRows(): Promise<CryptoHolding[]> {
  const { value } = await readSupabasePrimary({
    module: "getCryptoHoldingsRows",
    mock: () => getMockCryptoHoldings(),
    empty: () => [],
    read: fetchCryptoRows,
  });
  return value;
}

export async function getCryptoTrackerData(): Promise<CryptoTrackerData> {
  const transactions = await fetchCryptoTransactions();
  const { value, dataSource } = await readSupabasePrimary({
    module: "getCryptoTrackerData",
    mock: () => buildData([], "mock", undefined, undefined, transactions),
    empty: () => buildData([], "supabase", undefined, undefined, transactions),
    read: async (userId) =>
      buildData(await fetchCryptoRows(userId), "supabase", undefined, undefined, transactions),
  });
  return { ...value, dataSource, transactions };
}

export async function persistCryptoHolding(
  row: CryptoHolding,
  userId?: string
): Promise<CryptoHolding> {
  if (!isSupabaseConfigured()) {
    return upsertMockCryptoHolding({ ...row, user_id: userId ?? MOCK_USER_ID });
  }

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { data: existing } = await supabase
        .from("crypto_holdings")
        .select("id, created_at")
        .eq("user_id", effectiveUserId)
        .eq("ticker", row.ticker)
        .maybeSingle();

      const payload = {
        ...row,
        user_id: effectiveUserId,
        id: existing ? (existing as { id: string }).id : row.id,
        created_at: existing
          ? (existing as { created_at: string }).created_at
          : row.created_at,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("crypto_holdings")
        .upsert(payload as never, { onConflict: "user_id,ticker" });

      if (error) throw new Error(error.message);
      return payload;
    },
    () => {
      warnMissingDevUserIdForWrite();
      return upsertMockCryptoHolding({ ...row, user_id: MOCK_USER_ID });
    }
  );
}

export async function removeCryptoHolding(
  id: string,
  userId?: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    deleteMockCryptoHolding(id);
    return;
  }

  await withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { error } = await supabase
        .from("crypto_holdings")
        .delete()
        .eq("id", id)
        .eq("user_id", effectiveUserId);

      if (error) throw new Error(error.message);
    },
    () => {
      warnMissingDevUserIdForWrite();
      deleteMockCryptoHolding(id);
    }
  );
}
