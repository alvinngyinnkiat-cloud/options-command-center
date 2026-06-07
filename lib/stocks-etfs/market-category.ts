import type { CurrencyCode } from "@/types/database";
import type { EnrichedStockEtfHolding } from "./types";
import type { StockEtfAssetType } from "./types";

export type MarketCategory = "us_etf" | "us_stock" | "sg_stock";

export type UsEquityCategory = "us_etf" | "us_stock";

export const US_ETF_TAB: UsEquityCategory = "us_etf";
export const US_STOCK_TAB: UsEquityCategory = "us_stock";
export const SG_STOCK_TAB: MarketCategory = "sg_stock";

export function classifyMarketCategory(input: {
  assetType: StockEtfAssetType | string;
  currency: CurrencyCode | string;
}): MarketCategory {
  if (input.currency === "SGD") return "sg_stock";
  if (input.assetType === "etf") return "us_etf";
  return "us_stock";
}

export function classifyHoldingCategory(
  holding: Pick<EnrichedStockEtfHolding, "assetType" | "currency">
): MarketCategory {
  return classifyMarketCategory({
    assetType: holding.assetType,
    currency: holding.currency,
  });
}

export function categoryLabel(category: MarketCategory): string {
  switch (category) {
    case "us_etf":
      return "US ETF";
    case "us_stock":
      return "US Stock";
    case "sg_stock":
      return "SG Stock";
  }
}

export function filterHoldingsByCategory(
  holdings: EnrichedStockEtfHolding[],
  category: MarketCategory
): EnrichedStockEtfHolding[] {
  return holdings.filter((h) => classifyHoldingCategory(h) === category);
}

export function isUsEquityCategory(
  category: MarketCategory
): category is UsEquityCategory {
  return category === "us_etf" || category === "us_stock";
}
