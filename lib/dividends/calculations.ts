import { subYears, parseISO, startOfYear } from "date-fns";
import type { DividendRecordRow } from "@/types/database";
import type {
  DividendFormInput,
  DividendPortfolioSummary,
  DividendRecordView,
  TickerDividendTotals,
} from "./types";
import { dividendCategoryLabel, mapDividendRecordView } from "./types";

export function calculateGrossDividend(
  dividendPerShare: number,
  sharesHeld: number
): number {
  return Math.round(dividendPerShare * sharesHeld * 100) / 100;
}

export function calculateNetDividend(
  grossDividend: number,
  withholdingTax: number
): number {
  return Math.round((grossDividend - withholdingTax) * 100) / 100;
}

export function calculateDividendYieldPct(
  annualDividendIncome: number,
  currentMarketValue: number
): number {
  if (currentMarketValue <= 0) return 0;
  return (annualDividendIncome / currentMarketValue) * 100;
}

export function calculateIncomeYieldPct(
  annualDividendIncome: number,
  annualPremiumIncome: number,
  capitalDeployed: number
): number {
  if (capitalDeployed <= 0) return 0;
  return ((annualDividendIncome + annualPremiumIncome) / capitalDeployed) * 100;
}

export function computeSgdEquivalent(
  netDividend: number,
  currency: string,
  fxRateToSgd: number | null,
  marketValueNative?: number
): number {
  if (currency === "SGD") return netDividend;
  if (fxRateToSgd != null && fxRateToSgd > 0) {
    return Math.round(netDividend * fxRateToSgd * 100) / 100;
  }
  return marketValueNative ?? netDividend;
}

export function formToComputedAmounts(input: DividendFormInput): {
  grossDividend: number;
  netDividend: number;
  sgdEquivalent: number;
} {
  const gross =
    input.grossDividend ??
    calculateGrossDividend(input.dividendPerShare, input.sharesHeld);
  const net = input.netDividend ?? calculateNetDividend(gross, input.withholdingTax);
  const sgd =
    input.sgdEquivalent ??
    computeSgdEquivalent(net, input.currency, input.fxRateToSgd);
  return { grossDividend: gross, netDividend: net, sgdEquivalent: sgd };
}

function isReceivedRecord(row: DividendRecordRow): boolean {
  return row.is_received || row.status === "received";
}

function recordDateKey(row: DividendRecordRow): string {
  return row.payment_date ?? row.ex_dividend_date ?? row.created_at.slice(0, 10);
}

export function buildTickerDividendTotals(
  records: DividendRecordRow[],
  referenceDate: string,
  referenceYear: number
): Map<string, TickerDividendTotals> {
  const yearStart = startOfYear(parseISO(`${referenceYear}-01-01`));
  const trailingCutoff = subYears(parseISO(referenceDate), 1);
  const map = new Map<string, TickerDividendTotals>();

  for (const row of records) {
    const key = row.ticker.toUpperCase();
    const existing = map.get(key) ?? {
      ticker: key,
      market: row.market,
      category: row.category,
      netReceivedLifetime: 0,
      netReceivedYtd: 0,
      netReceivedAnnualTrailing: 0,
      grossReceivedYtd: 0,
      upcomingCount: 0,
      hasManualOverride: false,
    };

    if (row.is_manual_override || row.source === "manual") {
      existing.hasManualOverride = true;
    }

    if (row.status === "upcoming" || row.status === "estimated") {
      existing.upcomingCount++;
      map.set(key, existing);
      continue;
    }

    if (!isReceivedRecord(row)) {
      map.set(key, existing);
      continue;
    }

    const net = Number(row.net_dividend);
    const gross = Number(row.gross_dividend);
    existing.netReceivedLifetime += net;

    const payDate = recordDateKey(row);
    const parsed = parseISO(payDate);
    if (parsed >= yearStart) {
      existing.netReceivedYtd += net;
      existing.grossReceivedYtd += gross;
    }
    if (parsed >= trailingCutoff) {
      existing.netReceivedAnnualTrailing += net;
    }

    map.set(key, existing);
  }

  return map;
}

export function buildDividendPortfolioSummary(
  records: DividendRecordRow[],
  referenceDate: string,
  referenceYear: number
): DividendPortfolioSummary {
  const views = records.map(mapDividendRecordView);
  const byTicker = buildTickerDividendTotals(records, referenceDate, referenceYear);

  let totalNetDividendsYtd = 0;
  let usNetDividendsYtd = 0;
  let sgNetDividendsYtd = 0;
  let totalNetDividendsLifetime = 0;

  for (const totals of byTicker.values()) {
    totalNetDividendsYtd += totals.netReceivedYtd;
    totalNetDividendsLifetime += totals.netReceivedLifetime;
    if (totals.market === "US") usNetDividendsYtd += totals.netReceivedYtd;
    else sgNetDividendsYtd += totals.netReceivedYtd;
  }

  const upcoming = views
    .filter((r) => r.status === "upcoming" || r.status === "estimated")
    .sort((a, b) =>
      (a.exDividendDate ?? a.paymentDate ?? "").localeCompare(
        b.exDividendDate ?? b.paymentDate ?? ""
      )
    );

  const received = views
    .filter((r) => r.isReceived || r.status === "received")
    .sort((a, b) =>
      (b.paymentDate ?? b.exDividendDate ?? "").localeCompare(
        a.paymentDate ?? a.exDividendDate ?? ""
      )
    );

  const calendar = [...views].sort((a, b) =>
    (a.exDividendDate ?? a.paymentDate ?? "").localeCompare(
      b.exDividendDate ?? b.paymentDate ?? ""
    )
  );

  return {
    totalNetDividendsYtd,
    usNetDividendsYtd,
    sgNetDividendsYtd,
    totalNetDividendsLifetime,
    byTicker,
    upcoming,
    received,
    calendar,
  };
}

export function resolveTickerDividendIncome(
  ticker: string,
  totals: Map<string, TickerDividendTotals>
): { annualDividendIncome: number; lifetimeNetDividends: number } {
  const agg = totals.get(ticker.toUpperCase());
  if (!agg) {
    return { annualDividendIncome: 0, lifetimeNetDividends: 0 };
  }
  const annual =
    agg.netReceivedYtd > 0
      ? agg.netReceivedYtd
      : agg.netReceivedAnnualTrailing;
  const lifetime =
    agg.netReceivedLifetime > 0 ? agg.netReceivedLifetime : annual;
  return { annualDividendIncome: annual, lifetimeNetDividends: lifetime };
}

export function buildYieldRanking(
  totals: Map<string, TickerDividendTotals>,
  marketValues: Map<string, number>
): { ticker: string; categoryLabel: string; dividendYieldPct: number; annualIncome: number }[] {
  return [...totals.values()]
    .map((t) => {
      const mv = marketValues.get(t.ticker) ?? 0;
      const income = t.netReceivedYtd > 0 ? t.netReceivedYtd : t.netReceivedAnnualTrailing;
      return {
        ticker: t.ticker,
        categoryLabel: dividendCategoryLabel(t.category),
        dividendYieldPct: calculateDividendYieldPct(income, mv),
        annualIncome: income,
      };
    })
    .filter((r) => r.annualIncome > 0)
    .sort((a, b) => b.dividendYieldPct - a.dividendYieldPct);
}
