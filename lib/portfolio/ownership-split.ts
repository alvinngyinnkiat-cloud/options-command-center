/** Portfolio ownership split — Phase 17A */
export interface PortfolioOwnershipSplit {
  totalPortfolioSgd: number;
  clientPortfolioSgd: number;
  myPortfolioSgd: number;
  clientOwnershipPct: number;
  myOwnershipPct: number;
}

export function buildPortfolioOwnershipSplit(
  totalPortfolioSgd: number,
  clientPortfolioSgd: number | null | undefined
): PortfolioOwnershipSplit {
  const total = Math.max(0, totalPortfolioSgd);
  const clientRaw = Math.max(0, clientPortfolioSgd ?? 0);
  const client = Math.min(clientRaw, total);
  const my = Math.max(0, total - client);

  const clientOwnershipPct =
    total > 0 ? (client / total) * 100 : 0;
  const myOwnershipPct = total > 0 ? (my / total) * 100 : 0;

  return {
    totalPortfolioSgd: total,
    clientPortfolioSgd: client,
    myPortfolioSgd: my,
    clientOwnershipPct,
    myOwnershipPct,
  };
}

export function formatOwnershipPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
