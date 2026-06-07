import { getAlertsCenterData } from "@/lib/supabase/queries/alerts-center";
import { AlertsCenterClient } from "./AlertsCenterClient";

export async function AlertsCenterDashboard() {
  const data = await getAlertsCenterData();
  return <AlertsCenterClient initialData={data} />;
}
