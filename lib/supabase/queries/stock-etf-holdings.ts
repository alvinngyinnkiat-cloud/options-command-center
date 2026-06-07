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
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import type { StockEtfHolding } from "@/types/database";

async function buildFullData(
  rows: StockEtfHolding[],
  dataSource: "supabase" | "mock",
  userId = "mock-user"
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
  if (!isSupabaseConfigured()) {
    return getMockStockEtfHoldings();
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return getMockStockEtfHoldings();

    const { data, error } = await supabase
      .from("stock_etf_holdings")
      .select("*")
      .eq("user_id", user.id)
      .order("current_value_sgd", { ascending: false });

    if (error || !data?.length) return getMockStockEtfHoldings();
    return data as StockEtfHolding[];
  } catch {
    return getMockStockEtfHoldings();
  }
}

export async function getStockEtfTrackerData(): Promise<StockEtfTrackerData> {
  if (!isSupabaseConfigured()) {
    return buildFullData(getMockStockEtfHoldings(), "mock");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return buildFullData(getMockStockEtfHoldings(), "mock");
    }

    const { data, error } = await supabase
      .from("stock_etf_holdings")
      .select("*")
      .eq("user_id", user.id)
      .order("current_value_sgd", { ascending: false });

    if (error || !data?.length) {
      return buildFullData(getMockStockEtfHoldings(), "mock", user.id);
    }

    return buildFullData(data as StockEtfHolding[], "supabase", user.id);
  } catch {
    return buildFullData(getMockStockEtfHoldings(), "mock");
  }
}

export async function persistStockEtfHolding(
  row: StockEtfHolding,
  userId?: string
): Promise<StockEtfHolding> {
  if (!isSupabaseConfigured() || !userId) {
    return upsertMockStockEtfHolding({ ...row, user_id: userId ?? "mock-user" });
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("stock_etf_holdings")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("ticker", row.ticker)
    .maybeSingle();

  const payload = {
    ...row,
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
}

export async function removeStockEtfHolding(
  id: string,
  userId?: string
): Promise<void> {
  if (!isSupabaseConfigured() || !userId) {
    deleteMockStockEtfHolding(id);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("stock_etf_holdings")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
