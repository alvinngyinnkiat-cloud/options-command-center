import { getAutoWatchlistPageData } from "@/lib/supabase/queries/auto-watchlist";
import { AutoWatchlistClient } from "./AutoWatchlistClient";

export async function AutoWatchlistDashboard() {
  const data = await getAutoWatchlistPageData();
  return <AutoWatchlistClient initialData={data} />;
}
