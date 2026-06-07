import { DEFAULT_USD_SGD_RATE } from "@/lib/portfolio/currency";
import { calculateMarketValueSgd } from "@/lib/portfolio/currency";
import type { HoldingInput } from "@/lib/portfolio/types";
import { MOCK_PORTFOLIO_RAW } from "./portfolio";
import type { AssetType, CurrencyCode } from "@/types/database";

export interface PortfolioHoldingRecord extends HoldingInput {
  quantity: number;
}

function toRecord(h: HoldingInput, quantity = 1): PortfolioHoldingRecord {
  return { ...h, quantity };
}

let mockHoldings: PortfolioHoldingRecord[] = MOCK_PORTFOLIO_RAW.holdings.map(
  (h) => toRecord(h, 1)
);

export function getMockPortfolioHoldings(): PortfolioHoldingRecord[] {
  return [...mockHoldings];
}

export function getMockPortfolioRawWithHoldings() {
  const holdings = getMockPortfolioHoldings();
  const portfolioValue = holdings.reduce((s, h) => s + h.market_value_sgd, 0);
  return {
    ...MOCK_PORTFOLIO_RAW,
    holdings,
    portfolioValue,
  };
}

export function upsertMockPortfolioHolding(
  record: PortfolioHoldingRecord
): PortfolioHoldingRecord {
  const idx = mockHoldings.findIndex(
    (h) =>
      h.ticker === record.ticker && h.asset_type === record.asset_type
  );
  if (idx >= 0) {
    mockHoldings[idx] = record;
    return record;
  }
  mockHoldings.push(record);
  return record;
}

export function setMockPortfolioHoldings(
  records: PortfolioHoldingRecord[]
): void {
  mockHoldings = records;
}

export function resetMockPortfolioHoldings(): void {
  mockHoldings = MOCK_PORTFOLIO_RAW.holdings.map((h) => toRecord(h, 1));
}

export function holdingRecordFromCsv(input: {
  ticker: string;
  assetType: AssetType;
  currency: CurrencyCode;
  shares: number;
  costBasis: number | null;
  currentValue: number;
  fxRate?: number;
}): PortfolioHoldingRecord {
  const fxRate =
    input.currency === "SGD" ? 1 : (input.fxRate ?? DEFAULT_USD_SGD_RATE);
  const market_value_sgd = calculateMarketValueSgd(
    input.currentValue,
    input.currency,
    fxRate
  );
  return {
    ticker: input.ticker.toUpperCase(),
    asset_type: input.assetType,
    currency: input.currency,
    quantity: input.shares,
    market_value_native: input.currentValue,
    fx_rate_to_sgd: fxRate,
    market_value_sgd,
    market_value: market_value_sgd,
    cost_basis: input.costBasis,
  };
}
