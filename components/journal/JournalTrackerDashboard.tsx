import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { getJournalTrackerData } from "@/lib/supabase/queries/trading-journal";
import { JournalClient } from "./JournalClient";

interface JournalTrackerDashboardProps {
  initialTradeId?: string;
}

export async function JournalTrackerDashboard({
  initialTradeId,
}: JournalTrackerDashboardProps) {
  const [data, tradesData] = await Promise.all([
    getJournalTrackerData(),
    getOptionsTradesData(),
  ]);

  const initialTradeForForm = initialTradeId
    ? tradesData.trades.find((t) => t.id === initialTradeId) ?? null
    : null;

  return (
    <JournalClient
      initialData={data}
      trades={tradesData.trades}
      initialTradeForForm={initialTradeForForm}
    />
  );
}
