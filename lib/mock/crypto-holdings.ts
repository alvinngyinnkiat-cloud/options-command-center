import {
  MOCK_REFERENCE_DATE,
  MOCK_REFERENCE_ISO,
} from "@/lib/mock/reference-dates";
import type { CryptoHolding } from "@/types/database";

const MOCK_USER = "mock-user";
const now = MOCK_REFERENCE_ISO;
const today = MOCK_REFERENCE_DATE;

function row(
  partial: Omit<CryptoHolding, "user_id" | "created_at" | "updated_at">
): CryptoHolding {
  return {
    ...partial,
    user_id: MOCK_USER,
    created_at: now,
    updated_at: now,
  };
}

export const MOCK_CRYPTO_HOLDINGS: CryptoHolding[] = [
  row({
    id: "crypto-btc",
    asset_label: "BTC",
    ticker: "BTC",
    total_invested_sgd: 12_000,
    current_value_sgd: 15_520,
    notes: "DCA via exchange — total SGD deployed",
    last_updated: today,
  }),
  row({
    id: "crypto-eth",
    asset_label: "ETH",
    ticker: "ETH",
    total_invested_sgd: 5_500,
    current_value_sgd: 5_408,
    notes: null,
    last_updated: today,
  }),
  row({
    id: "crypto-usdt",
    asset_label: "USDT",
    ticker: "USDT",
    total_invested_sgd: 3_200,
    current_value_sgd: 3_200,
    notes: "Exchange stablecoin — crypto cash only",
    last_updated: today,
  }),
  row({
    id: "crypto-sol",
    asset_label: "SOL",
    ticker: "SOL",
    total_invested_sgd: 2_000,
    current_value_sgd: 2_340,
    notes: "Small allocation",
    last_updated: today,
  }),
];
