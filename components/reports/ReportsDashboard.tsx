import { getEnrichedPortfolioMetrics } from "@/lib/portfolio/enrich-capital-pools";
import { getTickerPositionManagerData } from "@/lib/supabase/queries/ticker-positions";
import { getDividendTrackerData } from "@/lib/supabase/queries/dividend-records";
import { getClientProfitSharingData } from "@/lib/supabase/queries/client-profit-sharing";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { getLatestDailySnapshot } from "@/lib/supabase/queries/daily-portfolio-snapshots";
import { ReportsClient } from "./ReportsClient";

async function resolveUserId(): Promise<string> {
  if (!isSupabaseConfigured()) return "mock-user";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? "mock-user";
}

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
