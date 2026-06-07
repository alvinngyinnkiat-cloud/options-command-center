import { getCryptoTrackerData } from "@/lib/supabase/queries/crypto-holdings";
import { CryptoTrackerClient } from "./CryptoTrackerClient";

export async function CryptoTrackerDashboard() {
  const data = await getCryptoTrackerData();
  return <CryptoTrackerClient initialData={data} />;
}
