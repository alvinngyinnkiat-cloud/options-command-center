import { getEnrichedPortfolioMetrics } from "@/lib/portfolio/enrich-capital-pools";
import { getTickerPositionManagerData } from "@/lib/supabase/queries/ticker-positions";
import { getDividendTrackerData } from "@/lib/supabase/queries/dividend-records";
import { getClientProfitSharingData } from "@/lib/supabase/queries/client-profit-sharing";
import { resolveUserId } from "@/lib/supabase/resolve-user";
import { getLatestDailySnapshot } from "@/lib/supabase/queries/daily-portfolio-snapshots";
import { ReportsClient } from "./ReportsClient";

export async function ReportsDashboard() {
  const userId = await resolveUserId();
  const [tickerData, dividendData, clientData, { capitalPools }, latestSnapshot] =
    await Promise.all([
      getTickerPositionManagerData(),
      getDividendTrackerData(userId),
      getClientProfitSharingData(),
      getEnrichedPortfolioMetrics(),
      getLatestDailySnapshot(userId),
    ]);
  return (
    <ReportsClient
      tickerData={tickerData}
      dividendData={dividendData}
      clientData={clientData}
      capitalPools={capitalPools}
      dataSource={tickerData.dataSource}
      recordedTotalAssetsManagedSgd={latestSnapshot?.totalAssetsManagedSgd ?? null}
    />
  );
}
