import { buildWeekendRankings } from "@/lib/weekend-review/rankings";
import { getAlertsCenterData } from "@/lib/supabase/queries/alerts-center";
import { getWatchlistScannerData } from "@/lib/supabase/queries/watchlist-scanner";
import {
  getWeekendReviewStatus,
  getWeeklyMarketUpdateHistory,
} from "@/lib/supabase/queries/weekly-market-updates";
import { WeekendRankingClient } from "./WeekendRankingClient";

export async function WeekendRankingDashboard() {
  const data = await getWatchlistScannerData();
  const rankings = buildWeekendRankings(data.rows);
  const [status, history, alertsData] = await Promise.all([
    getWeekendReviewStatus(data.rows.length, data.dataSource),
    getWeeklyMarketUpdateHistory(100),
    getAlertsCenterData(),
  ]);

  return (
    <WeekendRankingClient
      initialRows={data.rows}
      initialRankings={rankings}
      initialStatus={status}
      initialHistory={history}
      dataSource={data.dataSource}
      alerts={alertsData.alerts}
    />
  );
}
