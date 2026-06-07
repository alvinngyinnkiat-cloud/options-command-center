import { calculateTotalContribution } from "./calculations";
import type {
  MonthlyContributionFormInput,
  MonthlyContributionRecord,
} from "./types";
import type { MonthlyContribution as MonthlyContributionRow } from "@/types/database";

export function mapContributionRow(
  row: MonthlyContributionRow
): MonthlyContributionRecord {
  return {
    id: row.id,
    contributionMonth: row.contribution_month,
    contributionYear: row.contribution_year,
    stockOptionsAmountSgd: Number(row.stock_options_amount_sgd),
    cryptoAmountSgd: Number(row.crypto_amount_sgd),
    totalAmountSgd: Number(row.total_amount_sgd),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function contributionRowFromForm(
  input: MonthlyContributionFormInput,
  userId: string,
  id?: string,
  createdAt?: string
): MonthlyContributionRow {
  const total = calculateTotalContribution(
    input.stockOptionsAmountSgd,
    input.cryptoAmountSgd
  );
  const now = new Date().toISOString();

  return {
    id: id ?? crypto.randomUUID(),
    user_id: userId,
    contribution_month: input.contributionMonth,
    contribution_year: input.contributionYear,
    stock_options_amount_sgd: input.stockOptionsAmountSgd,
    crypto_amount_sgd: input.cryptoAmountSgd,
    total_amount_sgd: total,
    notes: input.notes,
    created_at: createdAt ?? now,
    updated_at: now,
  };
}
