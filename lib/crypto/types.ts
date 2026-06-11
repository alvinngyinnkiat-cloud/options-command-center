import type { DataSource } from "@/lib/portfolio/types";

import type { CryptoTransaction } from "@/types/database";

import type {
  CryptoAllocationSlice,
  CryptoDeploymentBucket,
  CryptoTierGroup,
} from "./allocation";

export type CryptoAssetLabel = "BTC" | "ETH" | "SOL" | "Other";

export interface CryptoHoldingFormInput {
  assetLabel: CryptoAssetLabel;
  ticker: string;
  totalInvestedSgd: number;
  currentValueSgd: number;
  notes: string | null;
  /** ISO date (YYYY-MM-DD) — closed date when current value is zero. */
  lastUpdated?: string;
}

export interface CryptoHoldingMetrics {
  profitLossSgd: number;
  returnPct: number;
  allocationPct: number;
}

export interface EnrichedCryptoHolding {
  id: string;
  assetLabel: CryptoAssetLabel;
  ticker: string;
  totalInvestedSgd: number;
  currentValueSgd: number;
  profitLossSgd: number;
  returnPct: number;
  allocationPct: number;
  notes: string | null;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
}

export interface CryptoTrackerSummary {
  totalInvestedSgd: number;
  totalCurrentValueSgd: number;
  totalProfitLossSgd: number;
  totalReturnPct: number;
  largestHolding: { ticker: string; valueSgd: number } | null;
  bestPerforming: { ticker: string; returnPct: number } | null;
}

export interface CryptoPortfolioManualState {
  cryptoHoldingsValueSgd: number;
  cryptoCashSgd: number;
  totalCryptoPortfolioValueSgd: number;
  totalContributionsSgd: number;
  profitLossSgd: number;
  returnPct: number;
  totalFeesPaidSgd: number;
}

export interface CryptoTrackerData {
  holdings: EnrichedCryptoHolding[];
  summary: CryptoTrackerSummary;
  portfolioManual: CryptoPortfolioManualState;
  allocationSlices: CryptoAllocationSlice[];
  tierGroups: CryptoTierGroup[];
  deploymentPlan: CryptoDeploymentBucket[];
  transactions: CryptoTransaction[];
  dataSource: DataSource;
}

export interface CryptoDepositInput {
  transactionDate: string;
  amountSgd: number;
  notes: string | null;
}

export interface CryptoBuyInput {
  transactionDate: string;
  ticker: string;
  coinName: string;
  buyAmountSgd: number;
  feeSgd: number;
  notes: string | null;
}

export interface CryptoSellInput {
  transactionDate: string;
  holdingId: string;
  sellAmountSgd: number;
  feeSgd: number;
  notes: string | null;
}

export interface CryptoManualAdjustmentInput {
  transactionDate: string;
  holdingId: string;
  ticker: string;
  coinName: string;
  totalInvestedSgd: number;
  currentValueSgd: number;
  notes: string | null;
}

export interface CryptoFeeInput {
  transactionDate: string;
  feeSgd: number;
  notes: string | null;
}

export type CryptoActionResult =
  | { success: true; data: CryptoTrackerData }
  | { success: false; error: string };
