import { getWatchlistPageData } from "@/lib/watchlist/get-watchlist-page-data";
import { WatchlistScannerClient } from "./WatchlistScannerClient";

export async function WatchlistScannerDashboard() {
  const { scanner, reviewStatus, alerts } = await getWatchlistPageData();

  return (
    <WatchlistScannerClient
      initialData={scanner}
      reviewStatus={reviewStatus}
      alerts={alerts}
    />
  );
}
