import { attachScoresToRows } from "@/lib/watchlist/scoring/map-row";
import { sortScannerRows } from "@/lib/watchlist/calculations";
import { buildWeekendReviewPageData } from "@/lib/weekend-review/page-data";
import type { WeekendReviewPageData } from "@/lib/weekend-review/types";
import { getWatchlistScannerData } from "@/lib/supabase/queries/watchlist-scanner";
import {
  getWeekendReviewStatus,
  getWeeklyMarketUpdateHistory,
} from "@/lib/supabase/queries/weekly-market-updates";

export async function getWeekendReviewPageData(): Promise<WeekendReviewPageData> {
  const data = await getWatchlistScannerData();
  const rows = attachScoresToRows(sortScannerRows(data.rows));
  const [status, history] = await Promise.all([
    getWeekendReviewStatus(rows.length, data.dataSource),
    getWeeklyMarketUpdateHistory(200),
  ]);

  return buildWeekendReviewPageData({
    rows,
    status,
    history,
    dataSource: data.dataSource,
  });
}
