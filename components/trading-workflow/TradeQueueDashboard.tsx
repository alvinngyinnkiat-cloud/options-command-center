import { buildTradeQueuePageData } from "@/lib/trading-workflow/build-workflow";
import { TradeQueueClient } from "./TradeQueueClient";

export async function TradeQueueDashboard() {
  const data = await buildTradeQueuePageData();
  return <TradeQueueClient initialData={data} />;
}
