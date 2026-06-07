import { buildCryptoHoldingMetrics } from "./calculations";
import type {
  CryptoHoldingFormInput,
  EnrichedCryptoHolding,
} from "./types";
import type { CryptoHolding } from "@/types/database";

export function enrichCryptoHolding(
  row: CryptoHolding,
  totalCryptoPortfolioValue: number
): EnrichedCryptoHolding {
  const totalInvestedSgd = Number(row.total_invested_sgd);
  const currentValueSgd = Number(row.current_value_sgd);
  const metrics = buildCryptoHoldingMetrics(
    totalInvestedSgd,
    currentValueSgd,
    totalCryptoPortfolioValue
  );

  return {
    id: row.id,
    assetLabel: row.asset_label as EnrichedCryptoHolding["assetLabel"],
    ticker: row.ticker,
    totalInvestedSgd,
    currentValueSgd,
    profitLossSgd: metrics.profitLossSgd,
    returnPct: metrics.returnPct,
    allocationPct: metrics.allocationPct,
    notes: row.notes,
    lastUpdated: row.last_updated,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function enrichAllCryptoHoldings(
  rows: CryptoHolding[]
): EnrichedCryptoHolding[] {
  const totalValue = rows.reduce(
    (s, r) => s + Number(r.current_value_sgd),
    0
  );
  return rows
    .map((r) => enrichCryptoHolding(r, totalValue))
    .sort((a, b) => b.currentValueSgd - a.currentValueSgd);
}

export function cryptoRowFromForm(
  input: CryptoHoldingFormInput,
  userId: string,
  existingId?: string,
  existingCreatedAt?: string
): CryptoHolding {
  const now = new Date().toISOString();
  const today = now.split("T")[0];
  return {
    id: existingId ?? crypto.randomUUID(),
    user_id: userId,
    asset_label: input.assetLabel,
    ticker: input.ticker.toUpperCase(),
    total_invested_sgd: input.totalInvestedSgd,
    current_value_sgd: input.currentValueSgd,
    notes: input.notes,
    last_updated: today,
    created_at: existingCreatedAt ?? now,
    updated_at: now,
  };
}
