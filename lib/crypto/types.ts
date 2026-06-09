import type { DataSource } from "@/lib/portfolio/types";

import type {
  CryptoAllocationSlice,
  CryptoDeploymentBucket,
  CryptoRankedHolding,
} from "./allocation";

export type CryptoAssetLabel = "BTC" | "ETH" | "SOL" | "Other";

export interface CryptoHoldingFormInput {
  assetLabel: CryptoAssetLabel;
  ticker: string;
  totalInvestedSgd: number;
  currentValueSgd: number;
  notes: string | null;
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
}

export interface CryptoTrackerData {
  holdings: EnrichedCryptoHolding[];
  summary: CryptoTrackerSummary;
  portfolioManual: CryptoPortfolioManualState;
  allocationSlices: CryptoAllocationSlice[];
  rankings: CryptoRankedHolding[];
  deploymentPlan: CryptoDeploymentBucket[];
  dataSource: DataSource;
}

export type CryptoActionResult =
  | { success: true; data: CryptoTrackerData }
  | { success: false; error: string };
