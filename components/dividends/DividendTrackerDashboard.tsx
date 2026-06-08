import { getDividendTrackerData } from "@/lib/supabase/queries/dividend-records";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { MOCK_USER_ID, resolveAuthenticatedUserId } from "@/lib/supabase/resolve-user";
import { DividendTrackerClient } from "./DividendTrackerClient";

async function resolveUserId(): Promise<string> {
  if (!isSupabaseConfigured()) return MOCK_USER_ID;
  return (await resolveAuthenticatedUserId()) ?? MOCK_USER_ID;
}

export async function DividendTrackerDashboard() {
  const userId = await resolveUserId();
  const data = await getDividendTrackerData(userId);
  return <DividendTrackerClient initialData={data} />;
}
