import { getAlertsCenterData } from "@/lib/supabase/queries/alerts-center";
import { getWatchlistScannerData } from "@/lib/supabase/queries/watchlist-scanner";
import { getWeekendReviewStatus } from "@/lib/supabase/queries/weekly-market-updates";
import { buildTradeQueuePageData } from "@/lib/trading-workflow/build-workflow";
import { WatchlistScannerClient } from "./WatchlistScannerClient";

export async function WatchlistScannerDashboard() {
  const data = await getWatchlistScannerData();
  const [reviewStatus, alertsData, workflow] = await Promise.all([
    getWeekendReviewStatus(data.rows.length, data.dataSource),
    getAlertsCenterData(),
    buildTradeQueuePageData(),
  ]);

  const readinessByTicker = Object.fromEntries(
    workflow.allReadiness.map((r) => [r.ticker, r])
  );

  return (
    <WatchlistScannerClient
      initialData={data}
      reviewStatus={reviewStatus}
      alerts={alertsData.alerts}
      readinessByTicker={readinessByTicker}
    />
  );
}
