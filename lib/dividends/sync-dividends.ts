import { fetchDividendsForTicker } from "@/lib/dividends/dividend-data-service";
import {
  classifyDividendCategory,
  marketFromHolding,
} from "@/lib/dividends/types";
import {
  calculateGrossDividend,
  calculateNetDividend,
  computeSgdEquivalent,
} from "@/lib/dividends/calculations";
import { enrichAllStockEtfHoldings } from "@/lib/stocks-etfs/map-holding";
import {
  getDividendTrackerData,
  listDividendRecordRows,
  upsertApiDividendRecord,
} from "@/lib/supabase/queries/dividend-records";
import { getStockEtfHoldingsRows } from "@/lib/supabase/queries/stock-etf-holdings";
import type { DividendRecordRow } from "@/types/database";
import { randomUUID } from "crypto";
import { parseISO, isBefore } from "date-fns";

export interface SyncDividendsResult {
  synced: number;
  skipped: number;
  providerSource: "fmp" | "alpha_vantage" | "mock";
}

function defaultWithholding(market: "US" | "SG", gross: number): number {
  if (market === "US") return Math.round(gross * 0.15 * 100) / 100;
  return 0;
}

export async function syncDividendsForUser(
  userId: string
): Promise<SyncDividendsResult> {
  const holdingRows = await getStockEtfHoldingsRows();
  const holdings = enrichAllStockEtfHoldings(holdingRows).filter(
    (h) => (h.sharesHeld ?? 0) > 0
  );

  let synced = 0;
  let skipped = 0;
  let providerSource: "fmp" | "alpha_vantage" | "mock" = "mock";

  for (const holding of holdings) {
    const { events, source } = await fetchDividendsForTicker(
      holding.ticker.toUpperCase()
    );
    providerSource = source;

    for (const event of events) {
      const shares = holding.sharesHeld ?? 0;
      const gross = calculateGrossDividend(event.dividendPerShare, shares);
      const withholding = defaultWithholding(
        marketFromHolding(holding),
        gross
      );
      const net = calculateNetDividend(gross, withholding);
      const payDate = event.paymentDate ?? event.exDividendDate;
      const isPast = payDate
        ? isBefore(parseISO(payDate), new Date())
        : false;

      const row: DividendRecordRow = {
        id: randomUUID(),
        user_id: userId,
        holding_id: holding.id,
        ticker: holding.ticker.toUpperCase(),
        market: marketFromHolding(holding),
        category: classifyDividendCategory(holding),
        ex_dividend_date: event.exDividendDate,
        record_date: event.recordDate,
        payment_date: event.paymentDate,
        dividend_per_share: event.dividendPerShare,
        shares_held: shares,
        gross_dividend: gross,
        withholding_tax: withholding,
        net_dividend: net,
        currency: holding.currency,
        sgd_equivalent: computeSgdEquivalent(
          net,
          holding.currency,
          holding.fxRateToSgd
        ),
        fx_rate_to_sgd: holding.fxRateToSgd,
        source: "api",
        status: isPast ? "received" : "upcoming",
        is_manual_override: false,
        is_received: isPast,
        notes: null,
        api_reference_id: event.apiReferenceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await upsertApiDividendRecord(row, userId);
      if (result) synced++;
      else skipped++;
    }
  }

  return { synced, skipped, providerSource };
}

export async function syncAndGetDividendData(userId: string) {
  const syncResult = await syncDividendsForUser(userId);
  const data = await getDividendTrackerData(userId, syncResult.providerSource);
  return { ...data, syncResult };
}

export async function getDividendRecordsForAggregation(
  userId: string
): Promise<DividendRecordRow[]> {
  return listDividendRecordRows(userId);
}
