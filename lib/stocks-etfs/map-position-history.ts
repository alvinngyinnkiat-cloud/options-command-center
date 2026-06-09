import type {
  EnrichedStockEtfPositionAdjustment,
  EnrichedStockEtfTransaction,
} from "@/lib/stocks-etfs/position-types";
import type {
  StockEtfPositionAdjustment,
  StockEtfTransaction,
} from "@/types/database";

export function mapStockEtfTransaction(
  row: StockEtfTransaction
): EnrichedStockEtfTransaction {
  return {
    id: row.id,
    holdingId: row.holding_id,
    transactionType: row.transaction_type,
    transactionDate: row.transaction_date,
    shares: Number(row.shares),
    pricePerShare: Number(row.price_per_share),
    totalAmount: Number(row.total_amount),
    fees: Number(row.fees),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapStockEtfAdjustment(
  row: StockEtfPositionAdjustment
): EnrichedStockEtfPositionAdjustment {
  return {
    id: row.id,
    holdingId: row.holding_id,
    adjustmentDate: row.adjustment_date,
    previousShares:
      row.previous_shares != null ? Number(row.previous_shares) : null,
    newShares: row.new_shares != null ? Number(row.new_shares) : null,
    previousAverageCost:
      row.previous_average_cost != null
        ? Number(row.previous_average_cost)
        : null,
    newAverageCost:
      row.new_average_cost != null ? Number(row.new_average_cost) : null,
    previousTotalCost:
      row.previous_total_cost != null ? Number(row.previous_total_cost) : null,
    newTotalCost:
      row.new_total_cost != null ? Number(row.new_total_cost) : null,
    previousNotes: row.previous_notes,
    newNotes: row.new_notes,
    adjustmentReason: row.adjustment_reason,
    userId: row.user_id,
    createdAt: row.created_at,
  };
}
