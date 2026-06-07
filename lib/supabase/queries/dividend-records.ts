import {
  buildDividendPortfolioSummary,
  buildYieldRanking,
  formToComputedAmounts,
} from "@/lib/dividends/calculations";
import {
  classifyDividendCategory,
  dividendCategoryLabel,
  mapDividendRecordView,
  marketFromHolding,
  type DividendFormInput,
  type DividendTrackerData,
} from "@/lib/dividends/types";
import {
  deleteMockDividendRecord,
  findMockByApiRef,
  getMockDividendRecords,
  upsertMockDividendRecord,
} from "@/lib/mock/dividend-records-store";
import { MOCK_REFERENCE_DATE } from "@/lib/mock/reference-dates";
import { enrichAllStockEtfHoldings } from "@/lib/stocks-etfs/map-holding";
import type { EnrichedStockEtfHolding } from "@/lib/stocks-etfs/types";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { getStockEtfHoldingsRows } from "@/lib/supabase/queries/stock-etf-holdings";
import type { DividendRecordRow } from "@/types/database";
import { randomUUID } from "crypto";

function normalizeRow(row: DividendRecordRow): DividendRecordRow {
  return {
    ...row,
    is_manual_override: row.is_manual_override ?? false,
    is_received: row.is_received ?? row.status === "received",
  };
}

function rowFromForm(
  input: DividendFormInput,
  userId: string,
  id?: string,
  existing?: DividendRecordRow
): DividendRecordRow {
  const amounts = formToComputedAmounts(input);
  const now = new Date().toISOString();

  return {
    id: id ?? randomUUID(),
    user_id: userId,
    holding_id: input.holdingId ?? existing?.holding_id ?? null,
    ticker: input.ticker.toUpperCase(),
    market: input.market,
    category: input.category,
    ex_dividend_date: input.exDividendDate,
    record_date: input.recordDate,
    payment_date: input.paymentDate,
    dividend_per_share: input.dividendPerShare,
    shares_held: input.sharesHeld,
    gross_dividend: amounts.grossDividend,
    withholding_tax: input.withholdingTax,
    net_dividend: amounts.netDividend,
    currency: input.currency,
    sgd_equivalent: amounts.sgdEquivalent,
    fx_rate_to_sgd: input.fxRateToSgd,
    source: input.source,
    status: input.status,
    is_manual_override:
      input.source === "manual" ||
      input.source === "broker" ||
      (existing?.is_manual_override ?? false),
    is_received: input.isReceived,
    notes: input.notes,
    api_reference_id: existing?.api_reference_id ?? null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
}

export async function listDividendRecordRows(
  userId: string
): Promise<DividendRecordRow[]> {
  if (!isSupabaseConfigured()) {
    return getMockDividendRecords(userId).map(normalizeRow);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dividend_records")
    .select("*")
    .eq("user_id", userId)
    .order("payment_date", { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as DividendRecordRow[]).map(normalizeRow);
}

async function persistDividendRow(
  row: DividendRecordRow,
  userId: string
): Promise<DividendRecordRow> {
  if (!isSupabaseConfigured()) {
    return upsertMockDividendRecord({ ...row, user_id: userId });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dividend_records")
    .upsert({ ...row, user_id: userId } as never)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return normalizeRow(data as DividendRecordRow);
}

export async function createDividendRecord(
  input: DividendFormInput,
  userId: string
): Promise<DividendRecordRow> {
  const row = rowFromForm(input, userId);
  row.is_manual_override =
    input.source === "manual" || input.source === "broker";
  return persistDividendRow(row, userId);
}

export async function updateDividendRecord(
  id: string,
  input: DividendFormInput,
  userId: string
): Promise<DividendRecordRow> {
  const rows = await listDividendRecordRows(userId);
  const existing = rows.find((r) => r.id === id);
  if (!existing) throw new Error("Dividend record not found.");

  const row = rowFromForm(input, userId, id, existing);
  row.is_manual_override = true;
  row.source = input.source === "api" ? "manual" : input.source;
  return persistDividendRow(row, userId);
}

export async function removeDividendRecord(
  id: string,
  userId: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    deleteMockDividendRecord(id);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("dividend_records")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function upsertApiDividendRecord(
  row: DividendRecordRow,
  userId: string
): Promise<DividendRecordRow | null> {
  if (row.api_reference_id) {
    if (!isSupabaseConfigured()) {
      const existing = findMockByApiRef(userId, row.api_reference_id);
      if (existing?.is_manual_override) return null;
    } else {
      const supabase = await createClient();
      const { data } = await supabase
        .from("dividend_records")
        .select("*")
        .eq("user_id", userId)
        .eq("api_reference_id", row.api_reference_id)
        .maybeSingle();
      if (data && (data as DividendRecordRow).is_manual_override) return null;
    }
  }

  return persistDividendRow({ ...row, user_id: userId }, userId);
}

export async function getDividendTrackerData(
  userId: string,
  providerSource: "fmp" | "alpha_vantage" | "mock" = "mock"
): Promise<DividendTrackerData> {
  const referenceDate = MOCK_REFERENCE_DATE;
  const referenceYear = Number(referenceDate.slice(0, 4));
  const [records, holdingRows] = await Promise.all([
    listDividendRecordRows(userId),
    getStockEtfHoldingsRows(),
  ]);

  const summary = buildDividendPortfolioSummary(
    records,
    referenceDate,
    referenceYear
  );

  const holdings = enrichAllStockEtfHoldings(holdingRows, summary.byTicker);
  const marketValues = new Map<string, number>();
  for (const h of holdings) {
    marketValues.set(h.ticker.toUpperCase(), h.currentValueNative);
  }

  const byMarket = [
    {
      market: "US" as const,
      totalNetYtd: summary.usNetDividendsYtd,
      count: records.filter((r) => r.market === "US").length,
    },
    {
      market: "SG" as const,
      totalNetYtd: summary.sgNetDividendsYtd,
      count: records.filter((r) => r.market === "SG").length,
    },
  ];

  return {
    records: records.map(mapDividendRecordView),
    summary,
    byMarket,
    yieldRanking: buildYieldRanking(summary.byTicker, marketValues),
    dataSource: isSupabaseConfigured() ? "supabase" : "mock",
    providerSource,
  };
}

export function formDefaultsFromHolding(
  holding: EnrichedStockEtfHolding
): Partial<DividendFormInput> {
  return {
    ticker: holding.ticker.toUpperCase(),
    market: marketFromHolding(holding),
    category: classifyDividendCategory(holding),
    sharesHeld: holding.sharesHeld ?? 0,
    currency: holding.currency,
    fxRateToSgd: holding.fxRateToSgd,
    holdingId: holding.id,
  };
}

export { dividendCategoryLabel, classifyDividendCategory };
