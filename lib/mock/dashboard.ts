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
  score: 78,
  maxScore: 100,
  status: "Healthy — within allocation and risk limits",
  factors: [
    { label: "Risk Utilization", value: "62%", status: "good" as const },
    { label: "Allocation", value: "50%", status: "good" as const },
    { label: "Open Exposure", value: "12 positions", status: "neutral" as const },
    { label: "DTE Concentration", value: "3 this week", status: "warn" as const },
  ],
};

export const MOCK_PORTFOLIO_STATS: PortfolioStat[] = [
  {
    label: "Portfolio Value",
    value: "$284,520",
    change: "+1.2%",
    changeType: "positive",
  },
  {
    label: "Available Risk Capacity",
    value: "$142,260",
    change: "50% utilized",
    changeType: "neutral",
  },
  {
    label: "Open Positions",
    value: "12",
    change: "3 expiring this week",
    changeType: "neutral",
  },
  {
    label: "MTD P&L",
    value: "+$4,820",
    change: "+1.7%",
    changeType: "positive",
  },
];

export const MOCK_POSITIONS: PositionSummary[] = [
  {
    symbol: "SPY",
    strategy: "Iron Condor",
    dte: 18,
    pnl: 420,
    pnlPercent: 42,
    status: "open",
  },
  {
    symbol: "QQQ",
    strategy: "Bull Put Spread",
    dte: 25,
    pnl: 185,
    pnlPercent: 61,
    status: "open",
  },
  {
    symbol: "IWM",
    strategy: "Bear Call Spread",
    dte: 11,
    pnl: -95,
    pnlPercent: -12,
    status: "open",
  },
  {
    symbol: "AAPL",
    strategy: "Bull Put Spread",
    dte: 32,
    pnl: 310,
    pnlPercent: 78,
    status: "closing",
  },
];

export const MOCK_MARKET_STATUS = {
  session: "Regular",
  time: "10:42 AM ET",
  vix: 14.82,
  spyChange: 0.34,
};
