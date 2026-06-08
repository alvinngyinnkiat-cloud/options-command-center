import { buildStockEtfTabData } from "@/lib/stocks-etfs/build-tab-data";
import { buildDividendPortfolioSummary } from "@/lib/dividends/calculations";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import { listDividendRecordRows } from "@/lib/supabase/queries/dividend-records";
import {
  buildSectorAllocation,
  buildStockEtfTrackerSummary,
} from "@/lib/stocks-etfs/calculations";
import {
  buildConcentrationWarnings,
  buildTopHoldings,
} from "@/lib/stocks-etfs/concentration";
import { enrichAllStockEtfHoldings } from "@/lib/stocks-etfs/map-holding";
import type { StockEtfTrackerData } from "@/lib/stocks-etfs/types";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import {
  deleteMockStockEtfHolding,
  getMockStockEtfHoldings,
  upsertMockStockEtfHolding,
} from "@/lib/mock/stock-etf-store";
import { readSupabasePrimary } from "@/lib/supabase/data-access";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { MOCK_USER_ID, warnMissingDevUserIdForWrite, withSupabaseQuery } from "@/lib/supabase/resolve-user";
import type { StockEtfHolding } from "@/types/database";

async function fetchStockEtfRows(_userId: string): Promise<StockEtfHolding[]> {
  return withSupabaseQuery(
    async ({ userId, supabase }) => {
      const { data, error } = await supabase
        .from("stock_etf_holdings")
        .select("*")
        .eq("user_id", userId)
        .order("current_value_sgd", { ascending: false });

      if (error) return [];
      return (data ?? []) as StockEtfHolding[];
    },
    () => []
  );
}

async function buildFullData(
  rows: StockEtfHolding[],
  dataSource: "supabase" | "mock",
  userId = MOCK_USER_ID
): Promise<StockEtfTrackerData> {
  const referenceDate = MOCK_REFERENCE_DATE;
  const referenceYear = Number(referenceDate.slice(0, 4));
  const [tradesData, dividendRows] = await Promise.all([
    getOptionsTradesData(),
    listDividendRecordRows(userId),
  ]);
  const dividendSummary = buildDividendPortfolioSummary(
    dividendRows,
    referenceDate,
    referenceYear
  );
  const holdings = enrichAllStockEtfHoldings(rows, dividendSummary.byTicker);
  const sectorAllocation = buildSectorAllocation(holdings);
  return {
    holdings,
    summary: buildStockEtfTrackerSummary(holdings),
    sectorAllocation,
    topHoldings: buildTopHoldings(holdings),
    warnings: buildConcentrationWarnings(holdings, sectorAllocation),
    tabs: buildStockEtfTabData(
      holdings,
      tradesData.trades,
      dividendSummary.byTicker
    ),
    dataSource,
  };
}

export async function getStockEtfHoldingsRows(): Promise<StockEtfHolding[]> {
  const { value } = await readSupabasePrimary({
    module: "getStockEtfHoldingsRows",
    mock: () => getMockStockEtfHoldings(),
    empty: () => [],
    read: fetchStockEtfRows,
  });
  return value;
}

export async function getStockEtfTrackerData(): Promise<StockEtfTrackerData> {
  const { value, dataSource } = await readSupabasePrimary({
    module: "getStockEtfTrackerData",
    mock: () => buildFullData(getMockStockEtfHoldings(), "mock"),
    empty: (userId) => buildFullData([], "supabase", userId),
    read: async (userId) => {
      const rows = await fetchStockEtfRows(userId);
      return buildFullData(rows, "supabase", userId);
    },
  });
  return { ...value, dataSource };
}

export async function persistStockEtfHolding(
  row: StockEtfHolding,
  userId?: string
): Promise<StockEtfHolding> {
  if (!isSupabaseConfigured()) {
    return upsertMockStockEtfHolding({ ...row, user_id: userId ?? MOCK_USER_ID });
  }

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { data: existing } = await supabase
        .from("stock_etf_holdings")
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
        .from("stock_etf_holdings")
        .upsert(payload as never, { onConflict: "user_id,ticker" });

      if (error) throw new Error(error.message);
      return payload;
    },
    () => {
      warnMissingDevUserIdForWrite();
      return upsertMockStockEtfHolding({ ...row, user_id: MOCK_USER_ID });
    }
  );
}

export async function removeStockEtfHolding(
  id: string,
  userId?: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    deleteMockStockEtfHolding(id);
    return;
  }

  await withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { error } = await supabase
        .from("stock_etf_holdings")
        .delete()
        .eq("id", id)
        .eq("user_id", effectiveUserId);

      if (error) throw new Error(error.message);
    },
    () => {
      warnMissingDevUserIdForWrite();
      deleteMockStockEtfHolding(id);
    }
  );
}
