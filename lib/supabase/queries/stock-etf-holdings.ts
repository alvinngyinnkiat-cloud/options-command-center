import { buildStockEtfTabData } from "@/lib/stocks-etfs/build-tab-data";
import { cashByCategory, calculateTotalFeesPaid } from "@/lib/stocks-etfs/cash-balances";
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
import { enrichAllStockEtfHoldings, enrichStockEtfHolding, stockEtfRowFromForm } from "@/lib/stocks-etfs/map-holding";
import { classifyHoldingCategory } from "@/lib/stocks-etfs/market-category";
import type { MarketCategory } from "@/lib/stocks-etfs/market-category";
import { DEFAULT_USD_SGD_RATE } from "@/lib/portfolio/currency";
import type { StockEtfHoldingFormInput } from "@/lib/stocks-etfs/types";
import type { StockEtfTrackerData } from "@/lib/stocks-etfs/types";
import { getStockEtfCashBalances, fetchPortfolioTradingCashSource } from "@/lib/supabase/queries/stock-etf-cash";
import {
  deriveTradingCashFromPortfolio,
  resolveDisplayTradingCash,
} from "@/lib/stocks-etfs/trading-cash-sync";
import { listStockEtfLedgerEntries } from "@/lib/supabase/queries/stock-etf-ledger";
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
  const [cashRows, ledger, portfolioTradingCash] = await Promise.all([
    getStockEtfCashBalances(userId),
    listStockEtfLedgerEntries(),
    fetchPortfolioTradingCashSource(userId),
  ]);
  const storedCash = cashByCategory(cashRows);
  const portfolioCash = deriveTradingCashFromPortfolio(portfolioTradingCash);
  const cashBalances = resolveDisplayTradingCash(
    storedCash,
    portfolioCash,
    ledger.length > 0
  );
  const feesFor = (cat: "us_etf" | "us_stock" | "sg_stock") =>
    calculateTotalFeesPaid(
      ledger.filter((e) => e.market_category === cat)
    );
  const tabs = buildStockEtfTabData(
    holdings,
    tradesData.trades,
    dividendSummary.byTicker
  );
  tabs.usEtf.summary.cashBalance = cashBalances.us_etf;
  tabs.usEtf.summary.totalFeesPaid = feesFor("us_etf");
  tabs.usStock.summary.cashBalance = cashBalances.us_stock;
  tabs.usStock.summary.totalFeesPaid = feesFor("us_stock");
  tabs.sgStock.summary.cashBalance = cashBalances.sg_stock;
  tabs.sgStock.summary.totalFeesPaid = feesFor("sg_stock");

  return {
    holdings,
    summary: buildStockEtfTrackerSummary(holdings),
    sectorAllocation,
    topHoldings: buildTopHoldings(holdings),
    warnings: buildConcentrationWarnings(holdings, sectorAllocation),
    tabs,
    cashBalances,
    ledger,
    totalFeesPaid: calculateTotalFeesPaid(ledger),
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

function formDefaultsForCategory(
  category: MarketCategory
): Pick<StockEtfHoldingFormInput, "assetType" | "currency"> {
  switch (category) {
    case "us_etf":
      return { assetType: "etf", currency: "USD" };
    case "us_stock":
      return { assetType: "stock", currency: "USD" };
    case "sg_stock":
      return { assetType: "stock", currency: "SGD" };
  }
}

export async function ensureStockEtfHoldingForBuy(
  userId: string,
  input: {
    marketCategory: MarketCategory;
    ticker: string;
    fxRateToSgd?: number;
  }
): Promise<StockEtfHolding> {
  const ticker = input.ticker.toUpperCase();
  const rows = isSupabaseConfigured()
    ? await fetchStockEtfRows(userId)
    : getMockStockEtfHoldings();
  const existing = rows.find((r) => r.ticker === ticker);

  if (existing) {
    const enriched = enrichStockEtfHolding(existing, 0);
    const category = classifyHoldingCategory(enriched);
    if (category !== input.marketCategory) {
      throw new Error(
        `${ticker} is tracked as ${category.replace("_", " ")} — use that market type.`
      );
    }
    return existing;
  }

  const defaults = formDefaultsForCategory(input.marketCategory);
  const form: StockEtfHoldingFormInput = {
    ticker,
    ...defaults,
    sector: "Others",
    totalInvestedNative: 0,
    currentValueNative: 0,
    fxRateToSgd: input.fxRateToSgd ?? DEFAULT_USD_SGD_RATE,
    sharesHeld: 0,
    averageCost: 0,
    notes: null,
  };
  const row = stockEtfRowFromForm(form, userId);
  return persistStockEtfHolding(row, userId);
}
