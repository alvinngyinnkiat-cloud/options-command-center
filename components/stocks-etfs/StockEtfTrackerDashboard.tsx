import { getStockEtfTrackerData } from "@/lib/supabase/queries/stock-etf-holdings";
import { StockEtfTrackerClient } from "./StockEtfTrackerClient";

export async function StockEtfTrackerDashboard() {
  const data = await getStockEtfTrackerData();
  return <StockEtfTrackerClient initialData={data} />;
}
