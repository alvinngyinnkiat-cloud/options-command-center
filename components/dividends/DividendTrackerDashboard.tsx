import { getDividendTrackerData } from "@/lib/supabase/queries/dividend-records";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { DividendTrackerClient } from "./DividendTrackerClient";

async function resolveUserId(): Promise<string> {
  if (!isSupabaseConfigured()) return "mock-user";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? "mock-user";
}

export async function DividendTrackerDashboard() {
  const userId = await resolveUserId();
  const data = await getDividendTrackerData(userId);
  return <DividendTrackerClient initialData={data} />;
}
