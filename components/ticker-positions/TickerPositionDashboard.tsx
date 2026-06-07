import { getTickerPositionManagerData } from "@/lib/supabase/queries/ticker-positions";
import { TickerPositionClient } from "./TickerPositionClient";

export async function TickerPositionDashboard() {
  const data = await getTickerPositionManagerData();
  return <TickerPositionClient data={data} />;
}
