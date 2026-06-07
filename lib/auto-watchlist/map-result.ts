import type { AutoWatchlistEntry, AutoWatchlistCategoryId } from "./types";
import type { AutoWatchlistResult } from "@/types/database";

export function entryToDbRow(
  entry: AutoWatchlistEntry,
  userId: string
): AutoWatchlistResult {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    category: entry.category,
    rank: entry.rank,
    ticker: entry.ticker,
    company_name: entry.companyName,
    market_cap: entry.marketCapBillions,
    sector: entry.sector,
    current_price: entry.currentPrice,
    one_year_performance_percent: entry.oneYearPerformancePercent,
    fifty_two_week_high: entry.fiftyTwoWeekHigh,
    fifty_two_week_low: entry.fiftyTwoWeekLow,
    distance_from_high_percent: entry.distanceFromHighPercent,
    distance_from_low_percent: entry.distanceFromLowPercent,
    generated_at: entry.generatedAt,
    created_at: now,
    updated_at: now,
  };
}

export function dbRowToEntry(row: AutoWatchlistResult): AutoWatchlistEntry {
  return {
    id: row.id,
    category: row.category as AutoWatchlistCategoryId,
    rank: row.rank,
    ticker: row.ticker,
    companyName: row.company_name,
    marketCapBillions: Number(row.market_cap),
    sector: row.sector,
    currentPrice: Number(row.current_price),
    oneYearPerformancePercent: Number(row.one_year_performance_percent),
    fiftyTwoWeekHigh: Number(row.fifty_two_week_high),
    fiftyTwoWeekLow: Number(row.fifty_two_week_low),
    distanceFromHighPercent: Number(row.distance_from_high_percent),
    distanceFromLowPercent: Number(row.distance_from_low_percent),
    generatedAt: row.generated_at,
  };
}
