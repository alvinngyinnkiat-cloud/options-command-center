import type { PortfolioHistoryPeriod } from "./daily-snapshot-types";

export type PortfolioHistoryFilterId =
  | "7d"
  | "30d"
  | "90d"
  | "ytd"
  | "1y"
  | "all";

export const DEFAULT_PORTFOLIO_HISTORY_FILTER: PortfolioHistoryFilterId = "7d";
export const DEFAULT_PORTFOLIO_CHART_PERIOD: PortfolioHistoryPeriod = "7D";

const TABLE_FILTER_KEY = "occ-portfolio-history-filter";
const CHART_PERIOD_KEY = "occ-portfolio-chart-period";

const VALID_FILTERS: PortfolioHistoryFilterId[] = [
  "7d",
  "30d",
  "90d",
  "ytd",
  "1y",
  "all",
];

const VALID_PERIODS: PortfolioHistoryPeriod[] = [
  "7D",
  "30D",
  "90D",
  "YTD",
  "1Y",
  "ALL",
];

export function filterIdToChartPeriod(
  filter: PortfolioHistoryFilterId
): PortfolioHistoryPeriod {
  if (filter === "all") return "ALL";
  return filter.toUpperCase() as PortfolioHistoryPeriod;
}

export function chartPeriodToFilterId(
  period: PortfolioHistoryPeriod
): PortfolioHistoryFilterId {
  if (period === "ALL") return "all";
  return period.toLowerCase() as PortfolioHistoryFilterId;
}

export function loadPortfolioHistoryFilter(): PortfolioHistoryFilterId {
  if (typeof window === "undefined") return DEFAULT_PORTFOLIO_HISTORY_FILTER;
  try {
    const raw = localStorage.getItem(TABLE_FILTER_KEY);
    if (raw && VALID_FILTERS.includes(raw as PortfolioHistoryFilterId)) {
      return raw as PortfolioHistoryFilterId;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PORTFOLIO_HISTORY_FILTER;
}

export function savePortfolioHistoryFilter(filter: PortfolioHistoryFilterId) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TABLE_FILTER_KEY, filter);
  } catch {
    /* ignore */
  }
}

export function loadPortfolioChartPeriod(): PortfolioHistoryPeriod {
  if (typeof window === "undefined") return DEFAULT_PORTFOLIO_CHART_PERIOD;
  try {
    const raw = localStorage.getItem(CHART_PERIOD_KEY);
    if (raw && VALID_PERIODS.includes(raw as PortfolioHistoryPeriod)) {
      return raw as PortfolioHistoryPeriod;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PORTFOLIO_CHART_PERIOD;
}

export function savePortfolioChartPeriod(period: PortfolioHistoryPeriod) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHART_PERIOD_KEY, period);
  } catch {
    /* ignore */
  }
}

export const PORTFOLIO_HISTORY_FILTERS: {
  id: PortfolioHistoryFilterId;
  label: string;
}[] = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
  { id: "ytd", label: "YTD" },
  { id: "1y", label: "1Y" },
  { id: "all", label: "All" },
];
