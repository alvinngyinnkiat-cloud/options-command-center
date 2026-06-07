import { getDataHealthPageData } from "@/lib/data-health/run-health-check";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { DataHealthClient } from "@/components/data-health/DataHealthClient";

async function resolveUserId(): Promise<string> {
  if (!isSupabaseConfigured()) return "mock-user";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? "mock-user";
}

export async function DataHealthDashboard() {
  const userId = await resolveUserId();
  const data = await getDataHealthPageData(userId);
  return <DataHealthClient initialData={data} />;
}
