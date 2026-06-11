import { DEFAULT_USD_SGD_RATE } from "@/lib/portfolio/currency";
import type { PortfolioOverride } from "@/types/database";

/** Merge an existing portfolio_overrides row with partial updates for upsert. */
export function mergePortfolioOverrideRow(
  userId: string,
  existing: PortfolioOverride | null,
  updates: Partial<PortfolioOverride> = {}
): PortfolioOverride {
  const now = new Date().toISOString();

  return {
    id: existing?.id ?? updates.id ?? crypto.randomUUID(),
    user_id: userId,
    use_manual_override:
      updates.use_manual_override ?? existing?.use_manual_override ?? false,
    manual_usd_sgd_rate:
      updates.manual_usd_sgd_rate ??
      existing?.manual_usd_sgd_rate ??
      DEFAULT_USD_SGD_RATE,
    manual_total_portfolio_value_sgd:
      updates.manual_total_portfolio_value_sgd ??
      existing?.manual_total_portfolio_value_sgd ??
      null,
    manual_stocks_value_sgd:
      updates.manual_stocks_value_sgd ?? existing?.manual_stocks_value_sgd ?? null,
    manual_etfs_value_sgd:
      updates.manual_etfs_value_sgd ?? existing?.manual_etfs_value_sgd ?? null,
    manual_crypto_value_sgd:
      updates.manual_crypto_value_sgd ?? existing?.manual_crypto_value_sgd ?? null,
    manual_cash_value_sgd:
      updates.manual_cash_value_sgd ?? existing?.manual_cash_value_sgd ?? null,
    manual_us_stocks_options_value_usd:
      updates.manual_us_stocks_options_value_usd ??
      existing?.manual_us_stocks_options_value_usd ??
      null,
    manual_us_stocks_options_sgd_equivalent:
      updates.manual_us_stocks_options_sgd_equivalent ??
      existing?.manual_us_stocks_options_sgd_equivalent ??
      null,
    manual_sg_stocks_cash_value_sgd:
      updates.manual_sg_stocks_cash_value_sgd ??
      existing?.manual_sg_stocks_cash_value_sgd ??
      null,
    manual_sg_stocks_value_sgd:
      updates.manual_sg_stocks_value_sgd ??
      existing?.manual_sg_stocks_value_sgd ??
      null,
    manual_sg_cash_value_sgd:
      updates.manual_sg_cash_value_sgd ??
      existing?.manual_sg_cash_value_sgd ??
      null,
    manual_trading_cash_usd:
      updates.manual_trading_cash_usd ?? existing?.manual_trading_cash_usd ?? null,
    manual_trading_cash_sgd:
      updates.manual_trading_cash_sgd ?? existing?.manual_trading_cash_sgd ?? null,
    manual_crypto_cash_sgd:
      updates.manual_crypto_cash_sgd ?? existing?.manual_crypto_cash_sgd ?? 0,
    manual_crypto_holdings_sgd:
      updates.manual_crypto_holdings_sgd ??
      existing?.manual_crypto_holdings_sgd ??
      null,
    manual_crypto_contributions_sgd:
      updates.manual_crypto_contributions_sgd ??
      existing?.manual_crypto_contributions_sgd ??
      null,
    manual_client_portfolio_sgd:
      updates.manual_client_portfolio_sgd ??
      existing?.manual_client_portfolio_sgd ??
      0,
    stock_etf_tracking_mode:
      updates.stock_etf_tracking_mode ??
      existing?.stock_etf_tracking_mode ??
      "manual",
    override_reason:
      updates.override_reason ?? existing?.override_reason ?? null,
    override_updated_at: updates.override_updated_at ?? now,
    created_at: existing?.created_at ?? updates.created_at ?? now,
    updated_at: now,
  };
}
