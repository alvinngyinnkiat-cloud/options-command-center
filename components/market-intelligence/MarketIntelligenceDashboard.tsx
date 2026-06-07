import { getMarketIntelligencePageData } from "@/lib/supabase/queries/market-intelligence";
import { MarketIntelligenceClient } from "./MarketIntelligenceClient";

export async function MarketIntelligenceDashboard() {
  const data = await getMarketIntelligencePageData();
  return <MarketIntelligenceClient initialData={data} />;
}
