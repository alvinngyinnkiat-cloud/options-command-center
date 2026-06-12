export type StockEtfTransactionType =
  | "buy"
  | "sell"
  | "opening_balance"
  | "dividend";

export type StockEtfUserTransactionType = "buy" | "sell";

export interface StockEtfTransactionInput {
  holdingId: string;
  transactionType: StockEtfUserTransactionType;
  transactionDate: string;
  shares: number;
  pricePerShare: number;
  fees?: number;
  notes?: string | null;
}

export type StockEtfFieldAdjusted =
  | "shares"
  | "capital_invested"
  | "current_value"
  | "dividend"
  | "fees"
  | "pl";

export interface StockEtfPositionAdjustInput {
  holdingId: string;
  shares: number;
  averageCost: number;
  totalCost: number;
  currentValueNative: number;
  manualTotalDividend: number;
  manualTotalFees: number;
  notes: string | null;
  adjustmentReason: string;
  adjustmentDate?: string;
}

export interface StockEtfFieldAdjustInput {
  adjustmentDate: string;
  ticker: string;
  field: StockEtfFieldAdjusted;
  newValue: number;
  notes?: string | null;
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
