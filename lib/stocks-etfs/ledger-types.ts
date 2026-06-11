import type { StockEtfLedgerTransactionType } from "@/types/database";

export const STOCK_ETF_LEDGER_LABELS: Record<
  StockEtfLedgerTransactionType,
  string
> = {
  monthly_contribution: "Monthly Contribution",
  manual_cash_sync: "Manual Cash Sync",
  buy: "Buy",
  sell: "Sell",
  dividend: "Dividend",
  manual_adjustment: "Manual Adjustment",
};

export function formatStockEtfLedgerType(
  type: StockEtfLedgerTransactionType
): string {
  return STOCK_ETF_LEDGER_LABELS[type] ?? type;
}
