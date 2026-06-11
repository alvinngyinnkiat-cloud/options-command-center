export interface PortfolioStat {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

export interface PositionSummary {
  symbol: string;
  strategy: string;
  dte: number;
  pnl: number;
  pnlPercent: number;
  status: "open" | "closing" | "closed";
}

export const MOCK_PORTFOLIO_HEALTH = {
  score: 0,
  maxScore: 100,
  status: "No portfolio data recorded yet",
  factors: [] as { label: string; value: string; status: "good" | "neutral" | "warn" }[],
};

export const MOCK_PORTFOLIO_STATS: PortfolioStat[] = [];

export const MOCK_POSITIONS: PositionSummary[] = [];

export const MOCK_MARKET_STATUS = {
  session: "Regular",
  time: "10:42 AM ET",
  vix: 14.82,
  spyChange: 0.34,
};
