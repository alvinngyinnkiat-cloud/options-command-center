import { getDataHealthPageData } from "@/lib/data-health/run-health-check";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { MOCK_USER_ID, resolveAuthenticatedUserId } from "@/lib/supabase/resolve-user";
import { DataHealthClient } from "@/components/data-health/DataHealthClient";

async function resolveUserId(): Promise<string> {
  if (!isSupabaseConfigured()) return MOCK_USER_ID;
  return (await resolveAuthenticatedUserId()) ?? MOCK_USER_ID;
}

export async function DataHealthDashboard() {
  const userId = await resolveUserId();
  const data = await getDataHealthPageData(userId);
  return <DataHealthClient initialData={data} />;
}
