import {
  defaultCashBalances,
  MARKET_CASH_CURRENCY,
} from "@/lib/stocks-etfs/cash-balances";
import type { MarketCategory } from "@/lib/stocks-etfs/market-category";
import {
  getMockStockEtfCashBalances,
  upsertMockStockEtfCashBalance,
} from "@/lib/mock/stock-etf-cash-store";
import { readSupabasePrimary } from "@/lib/supabase/data-access";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  MOCK_USER_ID,
  warnMissingDevUserIdForWrite,
  withSupabaseQuery,
} from "@/lib/supabase/resolve-user";
import type { PortfolioTradingCashSource } from "@/lib/stocks-etfs/trading-cash-sync";
import { MOCK_PORTFOLIO_OVERRIDE } from "@/lib/mock/portfolio";
import type { PortfolioOverride, StockEtfCashBalance } from "@/types/database";

async function fetchCashRows(userId: string): Promise<StockEtfCashBalance[]> {
  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { data, error } = await supabase
        .from("stock_etf_cash_balances")
        .select("*")
        .eq("user_id", effectiveUserId);

      if (error) return [];
      return (data ?? []) as StockEtfCashBalance[];
    },
    () => getMockStockEtfCashBalances()
  );
}

export async function getStockEtfCashBalances(
  userId?: string
): Promise<StockEtfCashBalance[]> {
  const { value } = await readSupabasePrimary({
    module: "getStockEtfCashBalances",
    mock: () => getMockStockEtfCashBalances(),
    empty: () => [],
    read: fetchCashRows,
  });

  if (value.length >= 3) return value;

  const effectiveUserId = userId ?? MOCK_USER_ID;
  const defaults = defaultCashBalances(effectiveUserId);
  const merged = defaults.map((d) => {
    const existing = value.find((v) => v.market_category === d.market_category);
    return existing ?? d;
  });
  return merged;
}

export async function persistStockEtfCashBalance(
  row: StockEtfCashBalance
): Promise<StockEtfCashBalance> {
  if (!isSupabaseConfigured()) {
    return upsertMockStockEtfCashBalance(row);
  }

  return withSupabaseQuery(
    async ({ userId, supabase }) => {
      const payload = { ...row, user_id: userId, updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from("stock_etf_cash_balances")
        .upsert(payload as never, { onConflict: "user_id,market_category" });
      if (error) throw new Error(error.message);
      return payload;
    },
    () => {
      warnMissingDevUserIdForWrite();
      return upsertMockStockEtfCashBalance({ ...row, user_id: MOCK_USER_ID });
    }
  );
}

export async function updateStockEtfCashForCategory(
  userId: string,
  marketCategory: MarketCategory,
  cashNative: number
): Promise<StockEtfCashBalance> {
  const rows = await getStockEtfCashBalances(userId);
  const existing =
    rows.find((r) => r.market_category === marketCategory) ??
    defaultCashBalances(userId).find((r) => r.market_category === marketCategory)!;

  return persistStockEtfCashBalance({
    ...existing,
    user_id: userId,
    cash_native: Math.max(0, cashNative),
    currency: MARKET_CASH_CURRENCY[marketCategory],
  });
}

export async function fetchPortfolioTradingCashSource(
  userId: string
): Promise<PortfolioTradingCashSource> {
  if (!isSupabaseConfigured()) {
    return {
      manualTradingCashUsd: MOCK_PORTFOLIO_OVERRIDE.manualTradingCashUsd,
      manualTradingCashSgd: MOCK_PORTFOLIO_OVERRIDE.manualTradingCashSgd,
    };
  }

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { data } = await supabase
        .from("portfolio_overrides")
        .select("manual_trading_cash_usd, manual_trading_cash_sgd")
        .eq("user_id", effectiveUserId)
        .maybeSingle();

      const row = data as PortfolioOverride | null;
      return {
        manualTradingCashUsd: row?.manual_trading_cash_usd ?? null,
        manualTradingCashSgd: row?.manual_trading_cash_sgd ?? null,
      };
    },
    () => ({
      manualTradingCashUsd: MOCK_PORTFOLIO_OVERRIDE.manualTradingCashUsd,
      manualTradingCashSgd: MOCK_PORTFOLIO_OVERRIDE.manualTradingCashSgd,
    })
  );
}
