import { parseISO, startOfMonth } from "date-fns";
import type { HoldingInput, PortfolioMetrics, PortfolioSnapshotSummary } from "./types";
import type { DailyPortfolioSnapshot } from "./daily-snapshot-types";
import type { PortfolioPnlBreakdown } from "@/lib/trades/pnl-allocation";
import type { DailyPortfolioSnapshot as DailyPortfolioSnapshotRow, DailyPortfolioSnapshotWrite } from "@/types/database";
import type { CapitalPoolsBreakdown } from "./capital-pools";
import { extractTradingCash } from "./capital-pools";
import { snapshotOnOrBefore } from "./snapshot-history";

type DailySnapshotGeneratedColumns =
  | "total_assets_managed_sgd"
  | "trading_cash_sgd"
  | "trading_capital_sgd";

type DailySnapshotWritablePayload = Omit<
  DailyPortfolioSnapshotRow,
  | "id"
  | "user_id"
  | "created_at"
  | "is_manual_entry"
  | "entered_by"
  | "updated_at"
  | DailySnapshotGeneratedColumns
>;

/** Mirror DB generated columns for mock store. */
export function applyMockGeneratedSnapshotColumns(
  row: Omit<DailyPortfolioSnapshotWrite, "is_manual_entry" | "entered_by" | "updated_at"> &
    Partial<Pick<DailyPortfolioSnapshotWrite, "is_manual_entry" | "entered_by" | "updated_at">>
): DailyPortfolioSnapshotRow {
  const trading_cash_sgd = Number(row.sgd_cash);
  const trading_capital_sgd =
    Number(row.us_etf_value_sgd) +
    Number(row.us_stock_value_sgd) +
    Number(row.sg_stock_value_sgd) +
    trading_cash_sgd +
    Number(row.current_options_value_sgd);

  return {
    ...row,
    is_manual_entry: row.is_manual_entry ?? false,
    entered_by: row.entered_by ?? "system",
    updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    trading_cash_sgd,
    trading_capital_sgd,
    total_assets_managed_sgd:
      Number(row.portfolio_value_sgd) +
      Number(row.client_current_value_sgd ?? 0),
  };
}

/** @deprecated Use applyMockGeneratedSnapshotColumns */
export const applyMockGeneratedTotalAssetsManaged =
  applyMockGeneratedSnapshotColumns;

/** Build snapshot payload from dashboard metrics (manual reconciliation priority). */
export function buildDailySnapshotPayload(input: {
  metrics: PortfolioMetrics;
  openRisk: number;
  pnl: PortfolioPnlBreakdown;
  snapshotDate?: string;
  capitalPools?: CapitalPoolsBreakdown;
}): DailySnapshotWritablePayload {
  const { metrics, openRisk, pnl, capitalPools } = input;
  const tradingCash = capitalPools
    ? {
        brokerUsdCashNative: capitalPools.cash.brokerUsdCashNative,
        brokerSgdCash: capitalPools.cash.brokerSgdCash,
      }
    : extractTradingCash(metrics.holdings);

  const portfolioValue =
    capitalPools?.myPortfolioValue ??
    metrics.myPortfolioValue ??
    metrics.portfolioValue;
  const usEtfValueSgd = capitalPools?.usEtfValueSgd ?? 0;
  const usStockValueSgd = capitalPools?.usStockValueSgd ?? 0;
  const sgStockValueSgd = capitalPools?.sgStockValueSgd ?? 0;
  const currentOptionsValueSgd = capitalPools?.optionsValueSgd ?? 0;
  const cryptoHoldingsSgd = capitalPools?.cryptoHoldingsSgd ?? metrics.cryptoValue;
  const cryptoCashSgd = capitalPools?.cryptoCashSgd ?? 0;

  const clientInitialCapital = capitalPools?.clientInitialCapital ?? 0;
  const clientCurrentValue = capitalPools?.clientCurrentValue ?? 0;

  return {
    snapshot_date:
      input.snapshotDate ?? new Date().toISOString().slice(0, 10),
    portfolio_value_sgd: portfolioValue,
    stock_options_value_sgd:
      usEtfValueSgd +
      usStockValueSgd +
      sgStockValueSgd +
      currentOptionsValueSgd,
    crypto_value_sgd: cryptoHoldingsSgd,
    usd_cash: tradingCash.brokerUsdCashNative,
    sgd_cash: tradingCash.brokerSgdCash,
    usd_cash_sgd_equivalent: 0,
    crypto_cash_sgd: cryptoCashSgd,
    us_etf_value_sgd: usEtfValueSgd,
    us_stock_value_sgd: usStockValueSgd,
    sg_stock_value_sgd: sgStockValueSgd,
    current_options_value_sgd: currentOptionsValueSgd,
    open_risk: openRisk,
    available_risk_capacity: metrics.availableRiskCapacity,
    personal_unrealized_pnl: pnl.myOpenPnl,
    personal_realized_pnl: pnl.myRealizedPnl,
    client_pnl: capitalPools?.clientPnl ?? pnl.clientOpenPnl + pnl.clientRealizedPnl,
    client_initial_capital_sgd: clientInitialCapital,
    client_current_value_sgd: clientCurrentValue,
    portfolio_health_score: metrics.healthScore.score,
    notes: null,
  };
}

/** Map daily_portfolio_snapshots rows to dashboard snapshot summaries (newest first). */
export function buildSnapshotSummariesFromDailyRows(
  rows: DailyPortfolioSnapshotRow[],
  openPositionsCount: number,
  limit = 6
): PortfolioSnapshotSummary[] {
  const mapped = rows.map(mapDailySnapshotRow);
  const sorted = [...mapped].sort(
    (a, b) =>
      parseISO(b.snapshotDate).getTime() - parseISO(a.snapshotDate).getTime()
  );

  return sorted.slice(0, limit).map((snap) => {
    const monthStart = startOfMonth(parseISO(snap.snapshotDate));
    const baseline = snapshotOnOrBefore(mapped, monthStart);
    const baselineValue = baseline?.portfolioValueSgd ?? snap.portfolioValueSgd;
    const mtdPnl = snap.portfolioValueSgd - baselineValue;
    const mtdPnlPct =
      baselineValue !== 0 ? (mtdPnl / baselineValue) * 100 : 0;

    return {
      id: snap.id,
      snapshotDate: snap.snapshotDate,
      portfolioValue: snap.portfolioValueSgd,
      availableRiskCapacity: snap.availableRiskCapacity,
      mtdPnl,
      mtdPnlPct,
      openPositionsCount,
      healthScore: snap.portfolioHealthScore,
    };
  });
}

export function mapDailySnapshotRow(
  row: DailyPortfolioSnapshotRow
): DailyPortfolioSnapshot {
  const tradingCashSgd = Number(row.trading_cash_sgd);
  const cryptoCashSgd = Number(row.crypto_cash_sgd ?? 0);

  return {
    id: row.id,
    snapshotDate: row.snapshot_date,
    portfolioValueSgd: Number(row.portfolio_value_sgd),
    stockOptionsValueSgd: Number(row.stock_options_value_sgd),
    cryptoValueSgd: Number(row.crypto_value_sgd),
    usdCash: Number(row.usd_cash),
    sgdCash: Number(row.sgd_cash),
    usdCashSgdEquivalent: Number(row.usd_cash_sgd_equivalent),
    tradingCashSgd,
    cryptoCashSgd,
    tradingCapitalSgd: Number(row.trading_capital_sgd),
    totalCashSgd: tradingCashSgd + cryptoCashSgd,
    openRisk: Number(row.open_risk),
    availableRiskCapacity: Number(row.available_risk_capacity),
    personalUnrealizedPnl: Number(row.personal_unrealized_pnl),
    personalRealizedPnl: Number(row.personal_realized_pnl),
    clientPnl: Number(row.client_pnl),
    clientInitialCapitalSgd: Number(row.client_initial_capital_sgd ?? 0),
    clientCurrentValueSgd: Number(row.client_current_value_sgd ?? 0),
    totalAssetsManagedSgd: Number(row.total_assets_managed_sgd),
    portfolioHealthScore:
      row.portfolio_health_score != null
        ? Number(row.portfolio_health_score)
        : null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
  };
}
