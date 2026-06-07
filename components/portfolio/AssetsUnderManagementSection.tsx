import { StatCard } from "@/components/ui/StatCard";
import type { CapitalPoolsBreakdown } from "@/lib/portfolio/capital-pools";
import { formatReturnPercent, formatSGD, formatSignedSGD } from "@/lib/utils";

interface AssetsUnderManagementSectionProps {
  pools: CapitalPoolsBreakdown;
  /** Latest recorded AUM from daily_portfolio_snapshots (DB-generated column). */
  recordedTotalAssetsManagedSgd?: number | null;
}

export function AssetsUnderManagementSection({
  pools,
  recordedTotalAssetsManagedSgd,
}: AssetsUnderManagementSectionProps) {
  const clientPnlPositive = pools.clientPnl >= 0;
  const totalAssetsManaged =
    recordedTotalAssetsManagedSgd ?? pools.totalAssetsManaged;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Assets Under Management
        </h2>
        <p className="mt-1 text-[11px] text-terminal-muted">
          My personal portfolio is separate from client capital. Total Assets
          Managed is informational only — not used for goals, CAGR, or milestones.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="My Portfolio Value"
          value={formatSGD(pools.myPortfolioValue)}
          change="Personal net worth only"
          changeType="neutral"
        />
        <StatCard
          label="Client Initial Capital"
          value={formatSGD(pools.clientInitialCapital)}
          change="Contributed for profit-sharing trades"
          changeType="neutral"
        />
        <StatCard
          label="Client Current Value"
          value={formatSGD(pools.clientCurrentValue)}
          change="Initial capital + client P/L"
          changeType="neutral"
        />
        <StatCard
          label="Client P/L"
          value={formatSignedSGD(pools.clientPnl)}
          change="Current value − initial capital"
          changeType={clientPnlPositive ? "positive" : "negative"}
        />
        <StatCard
          label="Client Return %"
          value={formatReturnPercent(pools.clientReturnPct)}
          change="Client P/L ÷ initial capital"
          changeType={clientPnlPositive ? "positive" : "negative"}
        />
        <StatCard
          label="Total Assets Managed"
          value={formatSGD(totalAssetsManaged)}
          change="My portfolio + client current value (recorded daily snapshot)"
          changeType="neutral"
        />
      </div>
    </section>
  );
}
