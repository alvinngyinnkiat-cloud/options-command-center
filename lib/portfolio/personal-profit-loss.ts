export interface PersonalPortfolioProfitLoss {
  myPortfolioValue: number;
  totalContributionsSgd: number;
  myPortfolioPnl: number;
  myReturnPct: number;
}

export function buildPersonalPortfolioProfitLoss(
  myPortfolioValue: number,
  totalContributionsSgd: number
): PersonalPortfolioProfitLoss {
  const myPortfolioPnl = myPortfolioValue - totalContributionsSgd;
  const myReturnPct =
    totalContributionsSgd > 0
      ? (myPortfolioPnl / totalContributionsSgd) * 100
      : 0;

  return {
    myPortfolioValue,
    totalContributionsSgd,
    myPortfolioPnl,
    myReturnPct,
  };
}
