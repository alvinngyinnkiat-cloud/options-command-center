import { getRiskDashboardData } from "@/lib/supabase/queries/risk-dashboard";
import { buildTradingWorkflowData } from "@/lib/trading-workflow/build-workflow";
import { RiskDashboardClient } from "./RiskDashboardClient";

export async function RiskDashboard() {
  const [data, workflow] = await Promise.all([
    getRiskDashboardData(),
    buildTradingWorkflowData(),
  ]);
  return <RiskDashboardClient initialData={data} workflow={workflow} />;
}
