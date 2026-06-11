import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { MOCK_USER_ID, withSupabaseQuery } from "@/lib/supabase/resolve-user";
import type { StockEtfTrackingMode } from "@/lib/stocks-etfs/tracking-mode";

export async function getStockEtfTrackingModeDefault(): Promise<StockEtfTrackingMode> {
  if (!isSupabaseConfigured()) return "manual";

  const mode = await withSupabaseQuery(
    async ({ userId, supabase }) => {
      const { data } = await supabase
        .from("portfolio_overrides")
        .select("stock_etf_tracking_mode")
        .eq("user_id", userId)
        .maybeSingle();

      const row = data as { stock_etf_tracking_mode?: string } | null;
      return row?.stock_etf_tracking_mode === "transaction"
        ? "transaction"
        : "manual";
    },
    () => "manual" as StockEtfTrackingMode
  );

  return mode;
}

export async function setStockEtfTrackingModeDefault(
  mode: StockEtfTrackingMode,
  userId?: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { data: existing } = await supabase
        .from("portfolio_overrides")
        .select("id")
        .eq("user_id", effectiveUserId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("portfolio_overrides")
          .update({ stock_etf_tracking_mode: mode } as never)
          .eq("user_id", effectiveUserId);
        if (error) throw new Error(error.message);
        return;
      }

      const { error } = await supabase.from("portfolio_overrides").insert({
        id: crypto.randomUUID(),
        user_id: effectiveUserId,
        stock_etf_tracking_mode: mode,
        use_manual_override: false,
        manual_usd_sgd_rate: 1.35,
        manual_crypto_cash_sgd: 0,
        manual_client_portfolio_sgd: 0,
      } as never);
      if (error) throw new Error(error.message);
    },
    () => undefined
  );
}
