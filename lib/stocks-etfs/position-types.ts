export type StockEtfTransactionType = "buy" | "sell";

export interface StockEtfTransactionInput {
  holdingId: string;
  transactionType: StockEtfTransactionType;
  transactionDate: string;
  shares: number;
  pricePerShare: number;
  fees?: number;
  notes?: string | null;
}

export interface StockEtfPositionAdjustInput {
  holdingId: string;
  shares: number;
  averageCost: number;
  totalCost: number;
  notes: string | null;
  adjustmentReason: string;
}

export interface PositionFromTransactions {
  shares: number;
  averageCost: number;
  totalCost: number;
}

export interface EnrichedStockEtfTransaction {
  id: string;
  holdingId: string;
  transactionType: StockEtfTransactionType;
  transactionDate: string;
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  fees: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnrichedStockEtfPositionAdjustment {
  id: string;
  holdingId: string;
  adjustmentDate: string;
  previousShares: number | null;
  newShares: number | null;
  previousAverageCost: number | null;
  newAverageCost: number | null;
  previousTotalCost: number | null;
  newTotalCost: number | null;
  previousNotes: string | null;
  newNotes: string | null;
  adjustmentReason: string;
  userId: string;
  createdAt: string;
}

export type StockEtfPositionActionResult =
  | { success: true }
  | { success: false; error: string };

export type StockEtfPositionHistoryResult<T> =
  | { success: true; data: T[] }
  | { success: false; error: string };
