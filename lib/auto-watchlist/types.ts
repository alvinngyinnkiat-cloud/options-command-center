import type { DataSource } from "@/lib/portfolio/types";

export type AutoWatchlistCategoryId =
  | "mega_cap_leaders"
  | "mega_cap_pullback"
  | "large_cap_pullback"
  | "mid_large_cap_pullback";

export interface MarketCapSnapshot {
  ticker: string;
  companyName: string;
  /** USD billions */
  marketCapBillions: number;
  sector: string;
  currentPrice: number;
  oneYearPerformancePercent: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

export interface AutoWatchlistEntry {
  id: string;
  category: AutoWatchlistCategoryId;
  rank: number;
  ticker: string;
  companyName: string;
  marketCapBillions: number;
  sector: string;
  currentPrice: number;
  oneYearPerformancePercent: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  distanceFromHighPercent: number;
  distanceFromLowPercent: number;
  generatedAt: string;
}

export interface AutoWatchlistCategory {
  id: AutoWatchlistCategoryId;
  title: string;
  description: string;
  entries: AutoWatchlistEntry[];
}

export interface AutoWatchlistPageData {
  categories: AutoWatchlistCategory[];
  generatedAt: string | null;
  manualWatchlistTickers: string[];
  dataSource: DataSource;
  marketDataSource: "mock" | "api";
}

export type AutoWatchlistActionResult =
  | { success: true; data: AutoWatchlistPageData }
  | { success: false; error: string };
