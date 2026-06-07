import { JournalTrackerDashboard } from "@/components/journal/JournalTrackerDashboard";

interface TradingJournalPageProps {
  searchParams: Promise<{ tradeId?: string }>;
}

export default async function TradingJournalPage({
  searchParams,
}: TradingJournalPageProps) {
  const { tradeId } = await searchParams;
  return <JournalTrackerDashboard initialTradeId={tradeId} />;
}
