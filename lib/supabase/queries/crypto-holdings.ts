import { buildCryptoTrackerSummary, buildCryptoPortfolioManualFromTracker } from "@/lib/crypto/calculations";
import {
  buildCryptoDeploymentPlan,
  buildCryptoTierGroups,
  tierGroupsToAllocationSlices,
} from "@/lib/crypto/allocation";
import { splitCryptoTrackerValues, resolveCryptoCashSgd } from "@/lib/portfolio/capital-pools";
import { enrichAllCryptoHoldings } from "@/lib/crypto/map-holding";
import type { CryptoTrackerData } from "@/lib/crypto/types";
import {
  deleteMockCryptoHolding,
  getMockCryptoHoldings,
  upsertMockCryptoHolding,
} from "@/lib/mock/crypto-store";
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
  pools?: { cryptoHoldingsSgd: number; cryptoCashSgd: number }
): CryptoTrackerData {
  const split = splitCryptoTrackerValues(rows);
  const cryptoHoldingsSgd = pools?.cryptoHoldingsSgd ?? split.cryptoHoldingsSgd;
  const cryptoCashSgd =
    pools?.cryptoCashSgd ??
    resolveCryptoCashSgd(override ?? null, split.cryptoCashSgd);
  const totalPortfolio = cryptoHoldingsSgd + cryptoCashSgd;
  const holdings = enrichAllCryptoHoldings(rows, totalPortfolio);
  const portfolioManual = buildCryptoPortfolioManualFromTracker({
    override: override ?? null,
    cryptoHoldingsValueSgd: cryptoHoldingsSgd,
    cryptoCashSgd,
    holdings,
  });

  const tierGroups = buildCryptoTierGroups(
    holdings,
    cryptoCashSgd,
    totalPortfolio
  );

  return {
    holdings,
    summary: buildCryptoTrackerSummary(holdings),
    portfolioManual,
    allocationSlices: tierGroupsToAllocationSlices(tierGroups),
    tierGroups,
    deploymentPlan: buildCryptoDeploymentPlan(cryptoCashSgd),
    dataSource,
  };
}

export async function buildCryptoTrackerPageData(
  override: import("@/lib/portfolio/types").PortfolioOverrideInput | null,
  pools: { cryptoHoldingsSgd: number; cryptoCashSgd: number }
): Promise<CryptoTrackerData> {
  const { value, dataSource } = await readSupabasePrimary({
    module: "buildCryptoTrackerPageData",
    mock: () => buildData(getMockCryptoHoldings(), "mock", override, pools),
    empty: () => buildData([], "supabase", override, pools),
    read: async (userId) =>
      buildData(await fetchCryptoRows(userId), "supabase", override, pools),
  });

  return { ...value, dataSource };
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
  const { value, dataSource } = await readSupabasePrimary({
    module: "getCryptoTrackerData",
    mock: () => buildData(getMockCryptoHoldings(), "mock"),
    empty: () => buildData([], "supabase"),
    read: async (userId) => buildData(await fetchCryptoRows(userId), "supabase"),
  });
  return { ...value, dataSource };
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
