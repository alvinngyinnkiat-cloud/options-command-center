import { getClientProfitSharingData } from "@/lib/supabase/queries/client-profit-sharing";
import { ClientProfitSharingClient } from "./ClientProfitSharingClient";

export async function ClientProfitSharingDashboard() {
  const data = await getClientProfitSharingData();
  return <ClientProfitSharingClient initialData={data} />;
}
