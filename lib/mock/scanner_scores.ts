export interface ScannerScore {
  symbol: string;
  score: number;
  strategy: string;
  rank: number;
  trend: "up" | "down" | "flat";
  ivRank: number;
  notes: string;
}

export const MOCK_SCANNER_SCORES: ScannerScore[] = [
  {
    symbol: "SPY",
    score: 84,
    strategy: "Iron Condor",
    rank: 1,
    trend: "flat",
    ivRank: 22,
    notes: "Tight range, low VIX — condor friendly",
  },
  {
    symbol: "QQQ",
    score: 79,
    strategy: "Bull Put Spread",
    rank: 2,
    trend: "up",
    ivRank: 28,
    notes: "Pullback to weekly support",
  },
  {
    symbol: "IWM",
    score: 72,
    strategy: "Bear Call Spread",
    rank: 3,
    trend: "down",
    ivRank: 31,
    notes: "Rejected at weekly resistance",
  },
  {
    symbol: "AAPL",
    score: 68,
    strategy: "Bull Put Spread",
    rank: 4,
    trend: "up",
    ivRank: 35,
    notes: "Holding daily support zone",
  },
  {
    symbol: "MSFT",
    score: 61,
    strategy: "Iron Condor",
    rank: 5,
    trend: "flat",
    ivRank: 19,
    notes: "Low IV — marginal premium",
  },
];
