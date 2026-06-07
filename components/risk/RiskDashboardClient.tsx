"use client";

import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatRiskPct } from "@/lib/risk/format";
import type { RiskDashboardData } from "@/lib/risk/types";
import type { TradingWorkflowData } from "@/lib/trading-workflow/types";
import { ExpectedReturnPanel } from "@/components/trading-workflow/ExpectedReturnPanel";
import { TradeReadinessPanel } from "@/components/trading-workflow/TradeReadinessPanel";
import { RiskAlertsPanel } from "./RiskAlertsPanel";
import { RiskSummaryCards } from "./RiskSummaryCards";
import { RiskTables } from "./RiskTables";
import { RiskUtilizationBar } from "./RiskUtilizationBar";
import { CapitalLiquidityCheck } from "./CapitalLiquidityCheck";
import { SingleLegStrategyChecks } from "./SingleLegStrategyChecks";
import { TickerExposureTable } from "./TickerExposureTable";

interface RiskDashboardClientProps {
  initialData: RiskDashboardData;
  workflow: TradingWorkflowData;
}

export function RiskDashboardClient({
  initialData,
  workflow,
}: RiskDashboardClientProps) {
  const { summary, settings } = initialData;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Dashboard"
        description="Capital, liquidity, and position risk — one trade per ticker"
        actions={
          <Badge
            variant={initialData.dataSource === "supabase" ? "success" : "outline"}
          >
            {initialData.dataSource === "supabase" ? "Live data" : "Mock data"}
          </Badge>
        }
      />

      <div className="rounded-lg border border-terminal-border bg-terminal-elevated/40 px-4 py-3 text-xs text-terminal-muted">
        Risk framework · Take Profit {settings.takeProfitPercent}% · Max Options
        Allocation {settings.maxOptionsAllocationPercent}% · Max Risk Per Trade{" "}
        {settings.maxRiskPerTradePercent}% · S/R manual only
      </div>

      <RiskSummaryCards summary={summary} />

      <RiskUtilizationBar
        utilizationPct={summary.riskUtilizationPct}
        zone={summary.riskZone}
      />

      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Risk Alerts
        </h2>
        <RiskAlertsPanel alerts={initialData.alerts} />
      </div>

      <CapitalLiquidityCheck base={initialData.capitalLiquidity} />

      <SingleLegStrategyChecks
        checks={initialData.singleLegChecks}
        usdCashAvailable={initialData.capitalLiquidity.cash.cashUsdNative}
      />

      {workflow.topReadiness[0] && (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
            Trade Readiness Score
          </h2>
          <TradeReadinessPanel readiness={workflow.topReadiness[0]} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Expected Return Dashboard
        </h2>
        <ExpectedReturnPanel data={workflow.expectedReturn} />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Ticker Exposure
        </h2>
        <TickerExposureTable rows={initialData.tickerExposure} />
      </section>

      <RiskTables byStrategy={initialData.openRiskByStrategy} />

      <p className="text-[11px] text-terminal-muted">
        Max options capital {formatRiskPct(settings.maxOptionsAllocationPercent, 0)}{" "}
        of portfolio · Per-trade limit{" "}
        {formatRiskPct(settings.maxRiskPerTradePercent, 1)} of available capacity ·
        Average Price for market comparisons · Support/resistance manual only
      </p>
    </div>
  );
}
